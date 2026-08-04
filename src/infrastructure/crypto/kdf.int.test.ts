import { describe, expect, it } from "vitest";
import { deriveContentKey, deriveMasterKey } from "./kdf.js";
import { Argon2Params } from "../../domain/credential/argon2-params.js";

const masterKey = Uint8Array.from({ length: 32 }, (_, index) => index);

describe("deriveContentKey", () => {
  it("matches the frozen HKDF-SHA256 known-answer vector", async () => {
    const contentKey = await deriveContentKey(masterKey);

    expect(toHex(contentKey)).toBe(
      "e31825edc3e9905c14ac3ae47a4ef69aae1b897b90e9e6f5b76b45894afa02e5",
    );
  });

  it("rejects a master key of the wrong length", async () => {
    await expect(deriveContentKey(new Uint8Array(31))).rejects.toThrow(
      "Master key must be 32 bytes.",
    );
  });
});

describe("deriveMasterKey", () => {
  it("rejects an Argon2 salt of the wrong length before allocating memory", async () => {
    await expect(
      deriveMasterKey({
        secret: new TextEncoder().encode("secret"),
        salt: new Uint8Array(15),
        params: Argon2Params.MIN,
      }),
    ).rejects.toThrow("Argon2 salt must be 16 bytes.");
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
