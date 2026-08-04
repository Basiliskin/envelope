import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { encodeBase64 } from "./base64.js";

describe("encodeBase64", () => {
  it("encodes the empty buffer to the empty string", () => {
    expect(encodeBase64(new Uint8Array(0))).toBe("");
  });

  it("matches Buffer's base64 encoding for known vectors", () => {
    const cases: readonly string[] = ["", "a", "ab", "abc", "abcd", "hello world"];
    for (const text of cases) {
      const bytes = new TextEncoder().encode(text);
      expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    }
  });

  it("round-trips through atob for arbitrary byte arrays", () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 512 }), (bytes) => {
        const encoded = encodeBase64(bytes);
        const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        expect(decoded).toEqual(bytes);
      }),
    );
  });

  it("handles a payload far larger than a safe call-stack argument list", () => {
    const bytes = new Uint8Array(500_000);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256;
    expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});
