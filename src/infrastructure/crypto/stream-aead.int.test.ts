import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  sealStream,
  unsealStream,
} from "./stream-aead.js";

const contentKey = Uint8Array.from({ length: 32 }, (_, index) => index);
const header = new TextEncoder().encode("canonical-header");
const noncePrefix = Uint8Array.of(0xde, 0xad, 0xbe, 0xef);

describe("sealStream and unsealStream", () => {
  it("matches a frozen AES-GCM STREAM known-answer vector", async () => {
    const chunks = await sealStream({
      plaintext: new TextEncoder().encode("SPK1 known answer"),
      contentKey,
      canonicalHeader: header,
      noncePrefix,
      chunkSize: 8,
    });

    expect(chunks.map((chunk) => toHex(chunk.ciphertext))).toEqual([
      "014670a5b3b52817d9ea1757f9813f256b44964d00ab5013",
      "c3a53e3b12b8a163239ae65aed1da27b019bab28c2ac43ea",
      "b3f3d9a0690a870d50496a5a64c8732d14",
    ]);
  });

  it("round-trips random payloads over random chunk boundaries", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ maxLength: 512 }),
        fc.integer({ min: 1, max: 64 }),
        async (plaintext, chunkSize) => {
          const chunks = await sealStream({
            plaintext,
            contentKey,
            canonicalHeader: header,
            noncePrefix,
            chunkSize,
          });
          const restored = await unsealStream({
            chunks,
            contentKey,
            canonicalHeader: header,
            noncePrefix,
            chunkSize,
          });

          expect(restored).toEqual(plaintext);
        },
      ),
      { numRuns: 50 },
    );
  });

  it.each([0, 1, 2])(
    "rejects one-byte tampering in chunk %i",
    async (chunkIndex) => {
      const chunks = await sealStream({
        plaintext: new TextEncoder().encode(
          "three chunks of authenticated material",
        ),
        contentKey,
        canonicalHeader: header,
        noncePrefix,
        chunkSize: 12,
      });
      const tampered = chunks.map((chunk) => ({
        index: chunk.index,
        ciphertext: chunk.ciphertext.slice(),
      }));
      const selected = tampered[chunkIndex];
      if (selected === undefined) {
        throw new Error("Test fixture did not produce the expected chunk.");
      }
      selected.ciphertext[0] = (selected.ciphertext[0] ?? 0) ^ 1;

      await expect(
        unsealStream({
          chunks: tampered,
          contentKey,
          canonicalHeader: header,
          noncePrefix,
          chunkSize: 12,
        }),
      ).rejects.toThrow(AuthenticationError);
    },
  );

  it("rejects truncation, reordering, splicing, and header tampering", async () => {
    const input = {
      plaintext: new TextEncoder().encode(
        "three chunks of authenticated material",
      ),
      contentKey,
      canonicalHeader: header,
      noncePrefix,
      chunkSize: 12,
    };
    const chunks = await sealStream(input);
    const secondPackage = await sealStream({
      ...input,
      canonicalHeader: new TextEncoder().encode("different-package-header"),
      plaintext: new TextEncoder().encode(
        "different authenticated material here",
      ),
    });
    const reordered = [chunks[1], chunks[0], chunks[2]].filter(
      (chunk) => chunk !== undefined,
    );
    const spliced = chunks.map((chunk, index) =>
      index === 1 ? (secondPackage[index] ?? chunk) : chunk,
    );
    const tamperedHeader = header.slice();
    tamperedHeader[0] = (tamperedHeader[0] ?? 0) ^ 1;

    await expect(
      unsealStream({ ...input, chunks: chunks.slice(0, -1) }),
    ).rejects.toThrow(AuthenticationError);
    await expect(unsealStream({ ...input, chunks: reordered })).rejects.toThrow(
      AuthenticationError,
    );
    await expect(unsealStream({ ...input, chunks: spliced })).rejects.toThrow(
      AuthenticationError,
    );
    await expect(
      unsealStream({ ...input, chunks, canonicalHeader: tamperedHeader }),
    ).rejects.toThrow(AuthenticationError);
  });

  it("rejects invalid keys, nonce prefixes, chunk sizes, and empty ciphertext streams", async () => {
    await expect(
      sealStream({
        plaintext: new Uint8Array(),
        contentKey: new Uint8Array(31),
        canonicalHeader: header,
        noncePrefix,
        chunkSize: 1,
      }),
    ).rejects.toThrow("Content key must be 32 bytes.");
    await expect(
      sealStream({
        plaintext: new Uint8Array(),
        contentKey,
        canonicalHeader: header,
        noncePrefix: new Uint8Array(3),
        chunkSize: 1,
      }),
    ).rejects.toThrow("Nonce prefix must be 4 bytes.");
    await expect(
      sealStream({
        plaintext: new Uint8Array(),
        contentKey,
        canonicalHeader: header,
        noncePrefix,
        chunkSize: 0,
      }),
    ).rejects.toThrow("Chunk size must be a non-zero uint32.");
    await expect(
      unsealStream({
        chunks: [],
        contentKey,
        canonicalHeader: header,
        noncePrefix,
        chunkSize: 1,
      }),
    ).rejects.toThrow(AuthenticationError);
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
