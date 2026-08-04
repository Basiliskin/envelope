import { describe, expect, it } from "vitest";
import {
  createManifest,
  createManifestEntry,
  InvalidManifestError,
  parseManifest,
  serializeManifest,
} from "./manifest.js";

const sha = (seed: number): Uint8Array =>
  Uint8Array.from({ length: 32 }, (_, i) => (i + seed) & 0xff);

describe("manifest", () => {
  it("serializes deterministically across reorders", () => {
    const entries = [
      createManifestEntry({ path: "b.txt", size: 2, sha256: sha(1) }),
      createManifestEntry({ path: "a.txt", size: 1, sha256: sha(2) }),
    ];
    const manifest = createManifest({ entries });
    const first = serializeManifest(manifest);
    const second = serializeManifest(manifest);
    expect(first).toEqual(second);
    const parsed = parseManifest(first);
    expect(parsed.entries.map((e) => e.path)).toEqual(["a.txt", "b.txt"]);
  });

  it("encodes sha256 as lowercase hex in the wire form", () => {
    const entry = createManifestEntry({
      path: "x.bin",
      size: 0,
      sha256: new Uint8Array(32).fill(0xab),
    });
    const bytes = serializeManifest(createManifest({ entries: [entry] }));
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('"sha256":"abababababababababababababababababababababababababababababababab"');
  });

  it("round-trips Unicode and deep paths", () => {
    const path = "folder/\u05d0\u05d1/\u0645\u0644\u0641.txt";
    const manifest = createManifest({
      entries: [createManifestEntry({ path, size: 7, sha256: sha(3) })],
    });
    const parsed = parseManifest(serializeManifest(manifest));
    expect(parsed.entries[0]?.path).toBe(path.normalize("NFC"));
  });

  it("rejects bad size, missing sha256, bad version", () => {
    expect(() =>
      createManifestEntry({ path: "x", size: -1, sha256: sha(0) }),
    ).toThrow(InvalidManifestError);
    expect(() =>
      createManifestEntry({ path: "x", size: 0, sha256: new Uint8Array(31) }),
    ).toThrow(InvalidManifestError);
    const manifest = createManifest({
      entries: [createManifestEntry({ path: "x", size: 0, sha256: sha(0) })],
    });
    const raw = parseJsonObject(serializeManifest(manifest));
    raw.version = 99;
    expect(() => parseManifest(new TextEncoder().encode(JSON.stringify(raw)))).toThrow(
      InvalidManifestError,
    );
  });

  it("rejects manifest that is not JSON or has wrong shape", () => {
    expect(() => parseManifest(new TextEncoder().encode("not json"))).toThrow(
      InvalidManifestError,
    );
    expect(() =>
      parseManifest(new TextEncoder().encode(JSON.stringify({ version: 1 }))),
    ).toThrow(InvalidManifestError);
  });

  it("rejects wire manifest with mode out of range", () => {
    const entry = createManifestEntry({
      path: "x",
      size: 0,
      sha256: new Uint8Array(32),
      mode: 0o100644,
    });
    const raw = parseJsonObject(serializeManifest(createManifest({ entries: [entry] })));
    const first = (raw.entries as unknown[])[0];
    if (first && typeof first === "object") {
      (first as Record<string, unknown>).mode = 0o10000000;
    }
    expect(() =>
      parseManifest(new TextEncoder().encode(JSON.stringify(raw))),
    ).toThrow(InvalidManifestError);
  });
});

function parseJsonObject(bytes: Uint8Array): Record<string, unknown> {
  const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("expected object");
  }
  return raw as Record<string, unknown>;
}
