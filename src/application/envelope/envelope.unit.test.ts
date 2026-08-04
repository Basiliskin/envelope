import { describe, expect, it } from "vitest";
import { type Manifest, serializeManifest } from "../../domain/archive/manifest.js";
import type { ArchiveEntry } from "../../domain/archive/archive.js";
import type {
  ArchiveReaderPort,
  ArchiveWriterPort,
  ArchiveWriteEvent,
} from "../ports/archive-ports.js";
import { Envelope } from "./envelope.js";

class InMemoryWriter implements ArchiveWriterPort {
  // eslint-disable-next-line @typescript-eslint/require-await -- async generator shape required by port contract
  async *write(
    entries: readonly ArchiveEntry[],
    manifest: Manifest,
    options: { readonly chunkSize: number },
  ): AsyncIterable<ArchiveWriteEvent> {
    const manifestBytes = serializeManifest(manifest);
    const blob = new Uint8Array(
      manifestBytes.byteLength + entries.reduce((s, e) => s + e.bytes.byteLength, 0),
    );
    let offset = 0;
    blob.set(manifestBytes, offset);
    offset += manifestBytes.byteLength;
    for (const entry of entries) {
      blob.set(entry.bytes, offset);
      offset += entry.bytes.byteLength;
    }
    for (let i = 0; i < blob.byteLength; i += options.chunkSize) {
      yield {
        kind: "data",
        bytes: blob.slice(i, Math.min(i + options.chunkSize, blob.byteLength)),
      };
    }
    yield { kind: "end" };
  }
}

class InMemoryReader implements ArchiveReaderPort {
  read(options: {
    readonly bytes: AsyncIterable<Uint8Array>;
    readonly expected: Manifest;
  }): AsyncIterable<ArchiveEntry> {
    const source = options.bytes;
    const expected = options.expected;
    return (async function* (): AsyncIterable<ArchiveEntry> {
      const collected: Uint8Array[] = [];
      for await (const part of source) collected.push(part);
      const total = collected.reduce((s, p) => s + p.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const part of collected) {
        merged.set(part, offset);
        offset += part.byteLength;
      }
      for (const entry of expected.entries) {
        const slice = merged.slice(0, entry.size);
        yield { path: entry.path, bytes: slice, mode: entry.mode };
      }
    })();
  }
}

describe("Envelope", () => {
  it("yields manifest first, then chunks at the requested size", async () => {
    const envelope = new Envelope(new InMemoryWriter(), new InMemoryReader());
    const entries = [
      { path: "a.txt", bytes: new Uint8Array(2000) },
      { path: "b.bin", bytes: new Uint8Array(500) },
    ];
    let manifest: Manifest | undefined;
    const chunkSizes: number[] = [];
    for await (const item of envelope.seal({ entries, chunkSize: 1024 })) {
      if ("version" in item) {
        manifest = item;
      } else {
        chunkSizes.push(item.bytes.byteLength);
      }
    }
    expect(manifest?.entries).toHaveLength(2);
    expect(chunkSizes.length).toBeGreaterThan(0);
    for (const size of chunkSizes) {
      expect(size).toBeLessThanOrEqual(1024);
    }
  });

  it("survives round-trip with reader", async () => {
    const writer = new InMemoryWriter();
    const reader = new InMemoryReader();
    const envelope = new Envelope(writer, reader);
    const entries = [{ path: "a.txt", bytes: new Uint8Array(100) }];
    let manifest: Manifest | undefined;
    const chunks: Uint8Array[] = [];
    for await (const item of envelope.seal({ entries, chunkSize: 64 })) {
      if ("version" in item) manifest = item;
      else chunks.push(item.bytes);
    }
    expect(manifest).toBeDefined();
    const out: ArchiveEntry[] = [];
    if (manifest) {
      // eslint-disable-next-line @typescript-eslint/require-await -- async generator required for AsyncIterable
      const source = (async function* (): AsyncIterable<Uint8Array> {
        for (const chunk of chunks) yield chunk;
      })();
      for await (const entry of envelope.open({ manifest, bytes: source })) {
        out.push(entry);
      }
    }
    expect(out[0]?.path).toBe("a.txt");
  });
});
