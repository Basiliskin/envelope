import {
  ARCHIVE_MAX_ENTRY_BYTES,
  DuplicateArchivePathError,
  normalizeArchivePath,
  type NormalizedArchivePath,
} from "./archive-path.js";

export {
  DuplicateArchivePathError,
  InvalidArchivePathError,
  ArchivePathTooDeepError,
  ARCHIVE_MAX_PATH_DEPTH,
  ARCHIVE_MAX_ENTRY_BYTES,
  ARCHIVE_MAX_PATH_BYTES,
  normalizeArchivePath,
  type NormalizedArchivePath,
} from "./archive-path.js";

export class InvalidArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArchiveError";
  }
}

export interface ArchiveEntryInput {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mode?: number;
}

export interface ArchiveEntry {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mode: number;
}

export class Archive {
  private constructor(readonly entries: readonly ArchiveEntry[]) {}

  static create(rawEntries: readonly ArchiveEntryInput[]): Archive {
    if (rawEntries.length === 0) {
      throw new InvalidArchiveError("An envelope must contain at least one file.");
    }
    const seen = new Set<string>();
    const normalized: ArchiveEntry[] = [];
    let totalBytes = 0;
    for (const input of rawEntries) {
      if (!(input.bytes instanceof Uint8Array)) {
        throw new InvalidArchiveError("Entry bytes must be a Uint8Array.");
      }
      const norm: NormalizedArchivePath = normalizeArchivePath(input.path);
      if (seen.has(norm.path)) {
        throw new DuplicateArchivePathError(`Duplicate archive path: ${norm.path}`);
      }
      seen.add(norm.path);
      const mode = input.mode ?? 0o100644;
      if (!Number.isInteger(mode) || mode < 0 || mode > 0o177777) {
        throw new InvalidArchiveError("Entry mode must be a valid unix mode.");
      }
      totalBytes += input.bytes.byteLength;
      if (totalBytes > ARCHIVE_MAX_ENTRY_BYTES) {
        throw new InvalidArchiveError(
          `Archive total size exceeds ${String(ARCHIVE_MAX_ENTRY_BYTES)} bytes.`,
        );
      }
      normalized.push({ path: norm.path, bytes: input.bytes, mode });
    }
    normalized.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    return new Archive(normalized);
  }

  totalBytes(): number {
    return this.entries.reduce((sum, entry) => sum + entry.bytes.byteLength, 0);
  }

  findEntry(path: string): ArchiveEntry | undefined {
    const norm = normalizeArchivePath(path);
    return this.entries.find((entry) => entry.path === norm.path);
  }
}
