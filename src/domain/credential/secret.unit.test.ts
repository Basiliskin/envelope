import { describe, expect, it } from "vitest";
import { SafeCombination } from "./safe-combination.js";
import { canonicalizeSecret, Password } from "./secret.js";

const decoder = new TextDecoder();

describe("Password", () => {
  it("normalizes Unicode using NFKC", () => {
    expect(Password.create("paｓｓword").normalized).toBe("password");
  });
});

describe("canonicalizeSecret", () => {
  it("binds the format, normalized password, and dial serialization", () => {
    const secret = canonicalizeSecret(
      Password.create("correct horse"),
      SafeCombination.create([37, 12, 88]),
    );

    expect(decoder.decode(secret)).toBe(
      "SPK1\0correct horse\0R1:CW:37|R2:CCW:12|R3:CW:88",
    );
  });
});
