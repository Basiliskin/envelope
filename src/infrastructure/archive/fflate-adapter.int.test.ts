import { describe, expect, it } from "vitest";
import { type Manifest, serializeManifest } from "../../domain/archive/manifest.js";
import { Envelope } from "../../application/envelope/envelope.js";
import { FflateArchiveReader, FflateArchiveWriter } from "./fflate-adapter.js";

const text = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("fflate archive adapter", () => {
  it("round-trips a single file", async () => {
    const writer = new FflateArchiveWriter();
    const reader = new FflateArchiveReader();
    const envelope = new Envelope(writer, reader);
    const entries = [{ path: "hello.txt", bytes: text("hi") }];
    let manifest: Manifest | undefined;
    const chunks: Uint8Array[] = [];
    for await (const item of envelope.seal({ entries, chunkSize: 16 })) {
      if ("version" in item) manifest = item;
      else chunks.push(item.bytes);
    }
    expect(manifest?.entries).toHaveLength(1);

    const out: { path: string; bytes: Uint8Array }[] = [];
    if (manifest) {
      // eslint-disable-next-line @typescript-eslint/require-await -- async generator required for AsyncIterable
      const source = (async function* (): AsyncIterable<Uint8Array> {
        for (const c of chunks) yield c;
      })();
      for await (const entry of envelope.open({ manifest, bytes: source })) {
        out.push(entry);
      }
    }
    expect(out[0]?.path).toBe("hello.txt");
    expect(new TextDecoder().decode(out[0]?.bytes)).toBe("hi");
  });

  it("preserves Unicode, RTL, deep paths, and empty files", async () => {
    const envelope = new Envelope(new FflateArchiveWriter(), new FflateArchiveReader());
    const rtl = "folder/\u05d0\u05d1/\u0645\u0644\u0641.txt";
    const entries = [
      { path: "empty.txt", bytes: new Uint8Array(0) },
      { path: rtl, bytes: text("RTL \u0627\u0644\u0644\u063a\u0629") },
    ];
    let manifest: Manifest | undefined;
    const chunks: Uint8Array[] = [];
    for await (const item of envelope.seal({ entries, chunkSize: 8 })) {
      if ("version" in item) manifest = item;
      else chunks.push(item.bytes);
    }
    const out = new Map<string, Uint8Array>();
    if (manifest) {
      // eslint-disable-next-line @typescript-eslint/require-await -- async generator required for AsyncIterable
      const source = (async function* (): AsyncIterable<Uint8Array> {
        for (const c of chunks) yield c;
      })();
      for await (const entry of envelope.open({ manifest, bytes: source })) {
        out.set(entry.path, entry.bytes);
      }
    }
    expect(out.get("empty.txt")?.byteLength).toBe(0);
    expect(out.get(rtl.normalize("NFC"))?.byteLength).toBeGreaterThan(0);
  });

  it("rejects chunkSize that is not a positive integer", async () => {
    const envelope = new Envelope(new FflateArchiveWriter(), new FflateArchiveReader());
    const iter = envelope.seal({ entries: [{ path: "x", bytes: text("y") }], chunkSize: 0 });
    const first = await iter[Symbol.asyncIterator]().next();
    expect(first.done).toBe(false);
    await expect(iter[Symbol.asyncIterator]().next()).rejects.toThrow(
      "Chunk size must be a positive integer.",
    );
  });

  it("manifest is parseable JSON and contains per-entry sha256", async () => {
    const envelope = new Envelope(new FflateArchiveWriter(), new FflateArchiveReader());
    let manifest: Manifest | undefined;
    for await (const item of envelope.seal({
      entries: [{ path: "a", bytes: text("a") }],
      chunkSize: 1024,
    })) {
      if ("version" in item) manifest = item;
    }
    expect(manifest?.entries[0]?.sha256.byteLength).toBe(32);
    if (manifest) {
      const wire = serializeManifest(manifest);
      const decoded = new TextDecoder().decode(wire);
      expect(decoded).toContain('"version":1');
    }
  });
});
