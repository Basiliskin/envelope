import { Argon2Params, type Argon2ParamsValue } from "../credential/argon2-params.js";
import type { FileBasket } from "./file-basket.js";
import {
  combinedEntropyBits,
  DIAL_ENTROPY_BITS,
  passwordEntropyBits,
} from "./entropy.js";
import {
  validateComposerCredential,
  type CredentialIssue,
} from "./credential-validation.js";

export type SealBlockerCode =
  | "basket-empty"
  | "credential-invalid"
  | "argon2-out-of-range"
  | "combined-entropy-below-threshold";

export interface SealBlocker {
  readonly code: SealBlockerCode;
  readonly message: string;
  readonly entropyBits?: number;
  readonly issues?: readonly CredentialIssue[];
}

export const MIN_COMBINED_ENTROPY_BITS = 80;

export function analyzeSealBlockers(input: {
  readonly basket: FileBasket;
  readonly password: string;
  readonly positions: readonly [unknown, unknown, unknown];
  readonly dialLocked: boolean;
  readonly argon2: Argon2ParamsValue | null;
}): readonly SealBlocker[] {
  const blockers: SealBlocker[] = [];
  if (input.basket.isEmpty()) {
    blockers.push({
      code: "basket-empty",
      message: "Add at least one file before sealing.",
    });
  }
  const credentialIssues = validateComposerCredential({
    password: input.password,
    positions: input.positions,
  });
  if (credentialIssues.length > 0) {
    blockers.push({
      code: "credential-invalid",
      message: "Fix the credential issues shown above.",
      issues: credentialIssues,
    });
  }
  if (input.argon2 === null) {
    blockers.push({
      code: "argon2-out-of-range",
      message: "Calibrate Argon2 parameters before sealing.",
    });
  } else {
    try {
      Argon2Params.create(input.argon2);
    } catch {
      blockers.push({
        code: "argon2-out-of-range",
        message:
          "Argon2 parameters must be between 256 MiB / 3 iterations and 1 GiB / 4 iterations.",
      });
    }
  }
  const bits = combinedEntropyBits({
    password: input.password,
    dialLocked: input.dialLocked,
  });
  if (bits < MIN_COMBINED_ENTROPY_BITS) {
    blockers.push({
      code: "combined-entropy-below-threshold",
      message: `Combined entropy is ${bits.toFixed(1)} bits — must reach ${String(MIN_COMBINED_ENTROPY_BITS)} bits.`,
      entropyBits: bits,
    });
  }
  return blockers;
}

export function passwordBits(password: string): number {
  return passwordEntropyBits(password);
}

export function dialBits(): number {
  return DIAL_ENTROPY_BITS;
}
