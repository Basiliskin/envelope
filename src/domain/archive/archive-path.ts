export class InvalidArchivePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArchivePathError";
  }
}

export class DuplicateArchivePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateArchivePathError";
  }
}

export class ArchivePathTooDeepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchivePathTooDeepError";
  }
}

export const ARCHIVE_MAX_PATH_DEPTH = 64;
export const ARCHIVE_MAX_PATH_BYTES = 1024;
export const ARCHIVE_MAX_ENTRY_BYTES = 100 * 1024 * 1024;

const FORWARD_SLASH = "/";
const BACKSLASH = "\\";
const NUL = "\0";

export interface NormalizedArchivePath {
  readonly path: string;
  readonly depth: number;
}

export function normalizeArchivePath(raw: string): NormalizedArchivePath {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new InvalidArchivePathError("Archive path must be a non-empty string.");
  }
  if (raw.length > ARCHIVE_MAX_PATH_BYTES) {
    throw new InvalidArchivePathError(
      `Archive path must be at most ${String(ARCHIVE_MAX_PATH_BYTES)} bytes.`,
    );
  }
  if (raw.includes(NUL)) {
    throw new InvalidArchivePathError("Archive path must not contain a NUL byte.");
  }
  if (raw.includes(BACKSLASH)) {
    throw new InvalidArchivePathError(
      "Archive path must use forward slashes, not backslashes.",
    );
  }
  if (raw.startsWith(FORWARD_SLASH)) {
    throw new InvalidArchivePathError("Archive path must be relative.");
  }
  if (raw.endsWith(FORWARD_SLASH)) {
    throw new InvalidArchivePathError("Archive path must not end with a slash.");
  }
  for (const segment of raw.split(FORWARD_SLASH)) {
    if (segment.length === 0) {
      throw new InvalidArchivePathError(
        "Archive path must not contain empty segments or parent traversal.",
      );
    }
    if (segment === "." || segment === "..") {
      throw new InvalidArchivePathError(
        "Archive path must not contain '.' or '..' segments.",
      );
    }
    // Intentional: control characters are exactly what we are rejecting.
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(segment)) {
      throw new InvalidArchivePathError(
        "Archive path must not contain control characters.",
      );
    }
  }
  const normalized = raw.normalize("NFC");
  const depth = normalized.split(FORWARD_SLASH).length;
  if (depth > ARCHIVE_MAX_PATH_DEPTH) {
    throw new ArchivePathTooDeepError(
      `Archive path depth must be at most ${String(ARCHIVE_MAX_PATH_DEPTH)}.`,
    );
  }
  return { path: normalized, depth };
}
