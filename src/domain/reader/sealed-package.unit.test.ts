import { describe, expect, it } from "vitest";
import { Argon2Params } from "../credential/argon2-params.js";
import { encodeHeader, SPK1_HEADER_SIZE } from "../../infrastructure/crypto/header-codec.js";
import { InvalidSealedPackageError, parseSealedPackage } from "./sealed-package.js";

function packageBytes(chunk = new Uint8Array(16)): Uint8Array {
  const header = encodeHeader({
    argon2: Argon2Params.MIN,
    salt: new Uint8Array(16),
    noncePrefix: new Uint8Array(4),
    chunkSize: 1024,
    chunkCount: 1,
  });
  const output = new Uint8Array(header.byteLength + 4 + chunk.byteLength);
  output.set(header);
  new DataView(output.buffer).setUint32(header.byteLength, chunk.byteLength, false);
  output.set(chunk, header.byteLength + 4);
  return output;
}

describe("parseSealedPackage", () => {
  it("parses the authenticated header and length-prefixed chunks", () => {
    const parsed = parseSealedPackage(packageBytes(new Uint8Array(17).fill(7)));

    expect(parsed.header).toHaveLength(SPK1_HEADER_SIZE);
    expect(parsed.memoryKiB).toBe(Argon2Params.MIN.memoryKiB);
    expect(parsed.chunks).toEqual([
      { index: 0, ciphertext: new Uint8Array(17).fill(7) },
    ]);
  });

  it.each([
    ["truncated header", new Uint8Array(SPK1_HEADER_SIZE - 1)],
    ["truncated chunk length", packageBytes().slice(0, SPK1_HEADER_SIZE + 2)],
    ["truncated chunk", packageBytes().slice(0, -1)],
    ["trailing data", new Uint8Array([...packageBytes(), 1])],
  ])("rejects %s", (_label, bytes) => {
    expect(() => parseSealedPackage(bytes)).toThrow(InvalidSealedPackageError);
  });

  it("rejects an invalid header", () => {
    const bytes = packageBytes();
    bytes[0] = 0;

    expect(() => parseSealedPackage(bytes)).toThrow(
      "The sealed package header is invalid.",
    );
  });
});
