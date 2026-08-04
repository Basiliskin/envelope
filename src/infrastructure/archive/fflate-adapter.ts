import { unzipSync, zipSync } from "fflate";

import type { ReaderArchivePort } from "../../application/reader/reader-ports.js";
import type { ReaderFile } from "../../domain/reader/types.js";
import type { ArchiveEntry } from "../../domain/archive/archive.js";
import {
  MANIFEST_ENTRY_NAME,
  parseManifest,
  serializeManifest,
} from "../../domain/archive/manifest.js";
import type { Manifest } from "../../domain/archive/manifest.js";
import type {
  ArchiveReaderPort,
  ArchiveWriterPort,
  ArchiveWriteEvent,
} from "../../application/ports/archive-ports.js";

export class FflateArchiveWriter implements ArchiveWriterPort {
  write(
    entries: readonly ArchiveEntry[],
    manifest: Manifest,
    options: { readonly chunkSize: number; readonly signal?: AbortSignal },
  ): AsyncIterable<ArchiveWriteEvent> {
    if (!Number.isInteger(options.chunkSize) || options.chunkSize < 1) {
      throw new Error("Chunk size must be a positive integer.");
    }
    if (options.signal?.aborted) {
      throw new Error("Aborted");
    }
    const files: Record<string, Uint8Array> = {};
    files[MANIFEST_ENTRY_NAME] = serializeManifest(manifest);
    for (const entry of entries) {
      files[entry.path] = entry.bytes;
    }
    const archiveBytes = zipSync(files, { level: 0 });
    const chunkSize = options.chunkSize;
    // eslint-disable-next-line @typescript-eslint/require-await -- async generator required by port contract
    return (async function* (): AsyncIterable<ArchiveWriteEvent> {
      for (let offset = 0; offset < archiveBytes.byteLength; offset += chunkSize) {
        if (options.signal?.aborted) {
          throw new Error("Aborted");
        }
        const end = Math.min(offset + chunkSize, archiveBytes.byteLength);
        yield { kind: "data", bytes: archiveBytes.slice(offset, end) };
      }
      yield { kind: "end" };
    })();
  }
}

export class FflateReaderArchive implements ReaderArchivePort {
  async extract(
    bytes: Uint8Array,
    signal: AbortSignal,
  ): Promise<readonly ReaderFile[]> {
    if (signal.aborted) throw new Error("Aborted");
    const decoded = unzipSync(bytes);
    const manifestBytes = decoded[MANIFEST_ENTRY_NAME];
    if (manifestBytes === undefined) {
      throw new Error("Archive manifest is missing.");
    }
    const manifest = parseManifest(manifestBytes);
    const allowed = new Set([
      MANIFEST_ENTRY_NAME,
      ...manifest.entries.map((entry) => entry.path),
    ]);
    for (const path of Object.keys(decoded)) {
      if (!allowed.has(path)) {
        throw new Error(`Archive contains unexpected entry: ${path}`);
      }
    }
    const files: ReaderFile[] = [];
    for (const entry of manifest.entries) {
      if (signal.aborted) throw new Error("Aborted");
      const data = decoded[entry.path];
      if (data === undefined) {
        throw new Error(`Archive missing expected entry: ${entry.path}`);
      }
      if (data.byteLength !== entry.size) {
        throw new Error(`Archive entry size mismatch: ${entry.path}`);
      }
      if (!equalBytes(await sha256(data), entry.sha256)) {
        throw new Error(`Archive entry digest mismatch: ${entry.path}`);
      }
      files.push({ path: entry.path, bytes: data, mode: entry.mode });
    }
    return files;
  }
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
  );
  return new Uint8Array(digest);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((byte, index) => byte === right[index]);
}

export class FflateArchiveReader implements ArchiveReaderPort {
  read(options: {
    readonly bytes: AsyncIterable<Uint8Array>;
    readonly expected: Manifest;
    readonly signal?: AbortSignal;
  }): AsyncIterable<ArchiveEntry> {
    const source = options.bytes;
    const expected = options.expected;
    const signal = options.signal;
    return (async function* (): AsyncIterable<ArchiveEntry> {
      const collected: Uint8Array[] = [];
      for await (const part of source) {
        if (signal?.aborted) {
          throw new Error("Aborted");
        }
        collected.push(part);
      }
      const total = collected.reduce((sum, part) => sum + part.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const part of collected) {
        merged.set(part, offset);
        offset += part.byteLength;
      }
      const decoded = unzipSync(merged);
      for (const entry of expected.entries) {
        const data = decoded[entry.path];
        if (data === undefined) {
          throw new Error(`Archive missing expected entry: ${entry.path}`);
        }
        if (data.byteLength !== entry.size) {
          throw new Error(
            `Entry ${entry.path} size mismatch: expected ${String(entry.size)}, got ${String(data.byteLength)}.`,
          );
        }
        yield { path: entry.path, bytes: data, mode: entry.mode };
      }
    })();
  }
}
