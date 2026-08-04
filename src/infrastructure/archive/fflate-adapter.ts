import { unzipSync, zipSync } from "fflate";

import type { ArchiveEntry } from "../../domain/archive/archive.js";
import { serializeManifest, type Manifest } from "../../domain/archive/manifest.js";
import { MANIFEST_ENTRY_NAME } from "../../domain/archive/manifest.js";
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
