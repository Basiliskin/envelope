import { argon2id } from "hash-wasm";
import type { Argon2Params } from "../../domain/credential/argon2-params.js";

const CONTENT_KEY_INFO = new TextEncoder().encode("content-key-v1").buffer;

export interface Argon2DeriveInput {
  readonly secret: Uint8Array;
  readonly salt: Uint8Array;
  readonly params: Argon2Params;
}

export async function deriveMasterKey(
  input: Argon2DeriveInput,
): Promise<Uint8Array> {
  if (input.salt.byteLength !== 16) {
    throw new Error("Argon2 salt must be 16 bytes.");
  }
  return argon2id({
    password: input.secret,
    salt: input.salt,
    iterations: input.params.iterations,
    memorySize: input.params.memoryKiB,
    parallelism: input.params.parallelism,
    hashLength: 32,
    outputType: "binary",
  });
}

export async function deriveContentKey(
  masterKey: Uint8Array,
): Promise<Uint8Array> {
  if (masterKey.byteLength !== 32) {
    throw new Error("Master key must be 32 bytes.");
  }
  const imported = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(masterKey),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new ArrayBuffer(0),
      info: CONTENT_KEY_INFO,
    },
    imported,
    256,
  );
  return new Uint8Array(bits);
}
