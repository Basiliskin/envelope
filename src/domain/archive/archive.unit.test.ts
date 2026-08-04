import { describe, expect, it } from "vitest";
import { Archive, DuplicateArchivePathError, InvalidArchiveError } from "./archive.js";

const a = new TextEncoder().encode("a");
const b = new TextEncoder().encode("bb");

describe("Archive", () => {
  it("rejects empty input", () => {
    expect(() => Archive.create([])).toThrow(InvalidArchiveError);
  });

  it("rejects duplicate paths after normalization", () => {
    const nfc = "folder/\u05d0.txt";
    const nfd = nfc.normalize("NFD");
    expect(() =>
      Archive.create([{ path: nfc, bytes: a }, { path: nfd, bytes: b }]),
    ).toThrow(DuplicateArchivePathError);
  });

  it("preserves Unicode and deep paths", () => {
    const path = "lvl1/lvl2/lvl3/\u0645\u0644\u0641.txt";
    const archive = Archive.create([{ path, bytes: a }]);
    expect(archive.entries[0]?.path).toBe(path.normalize("NFC"));
  });

  it("accepts an empty file as an entry", () => {
    const archive = Archive.create([{ path: "empty.txt", bytes: new Uint8Array(0) }]);
    expect(archive.totalBytes()).toBe(0);
    expect(archive.findEntry("empty.txt")?.bytes.byteLength).toBe(0);
  });

  it("sorts entries by normalized path", () => {
    const archive = Archive.create([
      { path: "b.txt", bytes: a },
      { path: "a.txt", bytes: a },
    ]);
    expect(archive.entries.map((e) => e.path)).toEqual(["a.txt", "b.txt"]);
  });

  it("rejects non-Uint8Array bytes", () => {
    expect(() =>
      Archive.create([{ path: "x", bytes: "string" as unknown as Uint8Array }]),
    ).toThrow(InvalidArchiveError);
  });
});
