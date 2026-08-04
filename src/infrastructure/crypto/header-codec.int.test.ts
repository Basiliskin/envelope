import { describe, expect, it } from "vitest";
import { Argon2Params } from "../../domain/credential/argon2-params.js";
import {
  decodeHeader,
  encodeHeader,
  InvalidHeaderError,
  SPK1_DEFAULT_CHUNK_SIZE,
  SPK1_HEADER_SIZE,
  SPK1_NONCE_PREFIX_SIZE,
  SPK1_SALT_SIZE,
  SPK1_VERSION,
} from "./header-codec.js";

const header = () => ({
  argon2: Argon2Params.DEFAULT,
  salt: Uint8Array.from({ length: 16 }, (_, index) => index),
  noncePrefix: Uint8Array.of(0xaa, 0xbb, 0xcc, 0xdd),
  chunkSize: SPK1_DEFAULT_CHUNK_SIZE,
  chunkCount: 3,
});

describe("encodeHeader", () => {
  it("encodes the frozen SPK1 binary layout", () => {
    const bytes = encodeHeader(header());

    expect(bytes.byteLength).toBe(SPK1_HEADER_SIZE);
    expect(toHex(bytes)).toBe(
      "53504b310001000800000000000301000102030405060708090a0b0c0d0e0faabbccdd0010000000000003",
    );
    expect(SPK1_VERSION).toBe(1);
    expect(SPK1_SALT_SIZE).toBe(16);
    expect(SPK1_NONCE_PREFIX_SIZE).toBe(4);
  });

  it("rejects malformed byte fields and counters", () => {
    expect(() =>
      encodeHeader({ ...header(), salt: new Uint8Array(15) }),
    ).toThrow(InvalidHeaderError);
    expect(() =>
      encodeHeader({ ...header(), noncePrefix: new Uint8Array(3) }),
    ).toThrow(InvalidHeaderError);
    expect(() => encodeHeader({ ...header(), chunkSize: 0 })).toThrow(
      InvalidHeaderError,
    );
    expect(() => encodeHeader({ ...header(), chunkCount: 0 })).toThrow(
      InvalidHeaderError,
    );
  });
});

describe("decodeHeader", () => {
  it("round-trips a valid header", () => {
    const decoded = decodeHeader(encodeHeader(header()));

    expect(decoded.argon2.toValue()).toEqual(Argon2Params.DEFAULT.toValue());
    expect(decoded.salt).toEqual(header().salt);
    expect(decoded.noncePrefix).toEqual(header().noncePrefix);
    expect(decoded.chunkSize).toBe(SPK1_DEFAULT_CHUNK_SIZE);
    expect(decoded.chunkCount).toBe(3);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 10, 14])(
    "rejects structurally invalid tampering at header offset %i",
    (offset) => {
      const tampered = encodeHeader(header());
      tampered[offset] = (tampered[offset] ?? 0) ^ 0xff;

      expect(() => decodeHeader(tampered)).toThrow(InvalidHeaderError);
    },
  );

  it.each([15, 31, 35, 39])(
    "parses structurally valid tampering at authenticated offset %i",
    (offset) => {
      const tampered = encodeHeader(header());
      tampered[offset] = (tampered[offset] ?? 0) ^ 0xff;

      expect(decodeHeader(tampered)).toBeDefined();
    },
  );

  it("rejects wrong header length", () => {
    expect(() => decodeHeader(new Uint8Array(SPK1_HEADER_SIZE - 1))).toThrow(
      InvalidHeaderError,
    );
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
