import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";
import { Password } from "../../domain/credential/secret.js";
import { SafeCombination } from "../../domain/credential/safe-combination.js";
import {
  analyzeSealBlockers,
  type SealBlocker,
} from "../../domain/composer/seal-blocker.js";
import { canonicalizeSecret } from "../../domain/credential/secret.js";
import type { FileBasket } from "../../domain/composer/file-basket.js";
import type { SealWorkerInput } from "../ports/worker-ports.js";

export interface PrepareSealInput {
  readonly basket: FileBasket;
  readonly password: string;
  readonly positions: readonly [unknown, unknown, unknown];
  readonly dialLocked: boolean;
  readonly argon2: Argon2ParamsValue | null;
  readonly salt: Uint8Array;
  readonly noncePrefix: Uint8Array;
  readonly chunkSize: number;
}

export type PrepareSealResult =
  | { readonly kind: "ready"; readonly input: SealWorkerInput }
  | {
      readonly kind: "blocked";
      readonly blockers: readonly SealBlocker[];
    };

export function prepareSeal(input: PrepareSealInput): PrepareSealResult {
  const blockers = analyzeSealBlockers({
    basket: input.basket,
    password: input.password,
    positions: input.positions,
    dialLocked: input.dialLocked,
    argon2: input.argon2,
  });
  if (blockers.length > 0) {
    return { kind: "blocked", blockers };
  }
  const validatedCombination = SafeCombination.create([
    input.positions[0] as number,
    input.positions[1] as number,
    input.positions[2] as number,
  ]);
  const password = Password.create(input.password);
  const canonicalSecret = canonicalizeSecret(password, validatedCombination);
  const entries: SealWorkerInput["entries"] = input.basket
    .snapshot()
    .map((entry) => ({
      path: entry.path,
      bytes: entry.content,
      mode: 0o100644,
    }));
  const argon2 = input.argon2;
  if (argon2 === null) {
    return {
      kind: "blocked",
      blockers: [
        {
          code: "argon2-out-of-range",
          message: "Calibrate Argon2 parameters before sealing.",
        },
      ],
    };
  }
  return {
    kind: "ready",
    input: {
      canonicalSecret,
      entries,
      argon2,
      salt: input.salt,
      noncePrefix: input.noncePrefix,
      chunkSize: input.chunkSize,
    },
  };
}
