import type { ArchiveEntry } from "../../domain/archive/archive.js";
import type { Manifest } from "../../domain/archive/manifest.js";

export type ArchiveWriteEvent =
  | { readonly kind: "data"; readonly bytes: Uint8Array }
  | { readonly kind: "end" };

export interface ArchiveWriterPort {
  write(
    entries: readonly ArchiveEntry[],
    manifest: Manifest,
    options: { readonly chunkSize: number; readonly signal?: AbortSignal },
  ): AsyncIterable<ArchiveWriteEvent>;
}

export interface ArchiveReaderPort {
  read(options: {
    readonly bytes: AsyncIterable<Uint8Array>;
    readonly expected: Manifest;
    readonly signal?: AbortSignal;
  }): AsyncIterable<ArchiveEntry>;
}
