import { describe, expect, it } from "vitest";
import {
  ARCHIVE_MAX_PATH_DEPTH,
  DuplicateArchivePathError,
  InvalidArchivePathError,
  ArchivePathTooDeepError,
  normalizeArchivePath,
} from "./archive-path.js";

describe("normalizeArchivePath", () => {
  it("normalizes Unicode paths to NFC and preserves depth", () => {
    const nfc = "\u05d0\u05d1\u05d2/\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae.txt";
    const nfd = nfc.normalize("NFD");
    const normalized = normalizeArchivePath(nfd);
    expect(normalized.path).toBe(nfc);
    expect(normalized.depth).toBe(2);
  });

  it("preserves RTL Arabic and mixed-script paths", () => {
    const path = "folder/\u0645\u0644\u0641.txt";
    const normalized = normalizeArchivePath(path);
    expect(normalized.path).toBe(path.normalize("NFC"));
    expect(normalized.depth).toBe(2);
  });

  it.each([
    ["", "non-empty"],
    ["/leading.txt", "relative"],
    ["trailing/", "must not end"],
    ["a//b", "empty segments"],
    ["a/./b", "'.'"],
    ["a/../b", "'..'"],
    ["a\\b", "backslashes"],
    ["a/b\u0000c", "NUL"],
    ["a/b\u0007c", "control"],
  ])("rejects %s", (input, fragment) => {
    expect(() => normalizeArchivePath(input)).toThrow(InvalidArchivePathError);
    expect(() => normalizeArchivePath(input)).toThrow(fragment);
  });

  it("rejects paths deeper than the cap", () => {
    const segments = Array.from({ length: ARCHIVE_MAX_PATH_DEPTH + 1 }, () => "x");
    expect(() => normalizeArchivePath(segments.join("/"))).toThrow(
      ArchivePathTooDeepError,
    );
  });

  it("accepts a path exactly at the depth cap", () => {
    const segments = Array.from({ length: ARCHIVE_MAX_PATH_DEPTH }, () => "x");
    const normalized = normalizeArchivePath(segments.join("/"));
    expect(normalized.depth).toBe(ARCHIVE_MAX_PATH_DEPTH);
  });

  it("DuplicateArchivePathError is exported and named correctly", () => {
    const error = new DuplicateArchivePathError("dup");
    expect(error.name).toBe("DuplicateArchivePathError");
    expect(error.message).toBe("dup");
  });
});
