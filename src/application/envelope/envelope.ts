import { Archive, type ArchiveEntry, type ArchiveEntryInput } from "../../domain/archive/archive.js";
import {
  createManifest,
  createManifestEntry,
  type Manifest,
} from "../../domain/archive/manifest.js";
import type {
  ArchiveReaderPort,
  ArchiveWriterPort,
  ArchiveWriteEvent,
} from "../ports/archive-ports.js";

export interface SealInput {
  readonly entries: readonly ArchiveEntryInput[];
  readonly chunkSize: number;
}

export interface PlaintextChunk {
  readonly index: number;
  readonly bytes: Uint8Array;
}

export class Envelope {
  constructor(
    private readonly writer: ArchiveWriterPort,
    private readonly reader: ArchiveReaderPort,
  ) {}

  async *seal(input: SealInput): AsyncIterable<Manifest | PlaintextChunk> {
    const archive: Archive = Archive.create(input.entries);
    const manifest = await this.buildManifest(archive);
    yield manifest;
    yield* this.chunkPlaintext(archive, manifest, input.chunkSize);
  }

  open(input: { readonly manifest: Manifest; readonly bytes: AsyncIterable<Uint8Array> }): AsyncIterable<ArchiveEntry> {
    return this.reader.read({ bytes: input.bytes, expected: input.manifest });
  }

  private async buildManifest(archive: Archive): Promise<Manifest> {
    const entries = await Promise.all(
      archive.entries.map(async (entry) =>
        createManifestEntry({
          path: entry.path,
          size: entry.bytes.byteLength,
          sha256: await sha256(entry.bytes),
          mode: entry.mode,
        }),
      ),
    );
    return createManifest({ entries });
  }

  private async *chunkPlaintext(
    archive: Archive,
    manifest: Manifest,
    chunkSize: number,
  ): AsyncIterable<PlaintextChunk> {
    let index = 0;
    for await (const event of this.writer.write(archive.entries, manifest, {
      chunkSize,
    })) {
      for (const part of splitDataEvent(event, chunkSize)) {
        yield { index: index, bytes: part };
        index += 1;
      }
    }
  }
}

function* splitDataEvent(
  event: ArchiveWriteEvent,
  chunkSize: number,
): Iterable<Uint8Array> {
  if (event.kind !== "data") return;
  const buffer = event.bytes;
  for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, buffer.byteLength);
    yield buffer.slice(offset, end);
  }
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const view = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  return new Uint8Array(digest);
}
