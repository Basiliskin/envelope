import type { SafeCombination } from "./safe-combination.js";

const TEXT_ENCODER = new TextEncoder();

export class Password {
  private constructor(readonly normalized: string) {}

  static create(value: string): Password {
    return new Password(value.normalize("NFKC"));
  }
}

export function canonicalizeSecret(
  password: Password,
  combination: SafeCombination,
): Uint8Array {
  return TEXT_ENCODER.encode(
    `SPK1\0${password.normalized}\0${combination.canonical()}`,
  );
}
