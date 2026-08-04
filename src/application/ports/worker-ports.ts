import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";

export type WorkerPhase = "kdf" | "seal" | "unseal";

export interface WorkerProgress {
  readonly phase: WorkerPhase;
  readonly current: number;
  readonly total: number;
}

export interface SealWorkerInput {
  readonly canonicalSecret: Uint8Array;
  readonly entries: readonly {
    readonly path: string;
    readonly bytes: Uint8Array;
    readonly mode: number;
  }[];
  readonly argon2: Argon2ParamsValue;
  readonly salt: Uint8Array;
  readonly noncePrefix: Uint8Array;
  readonly chunkSize: number;
}

export interface SealWorkerResult {
  readonly header: Uint8Array;
  readonly chunks: readonly {
    readonly index: number;
    readonly ciphertext: Uint8Array;
  }[];
}

export interface UnsealWorkerInput {
  readonly canonicalSecret: Uint8Array;
  readonly header: Uint8Array;
  readonly sealedChunks: readonly {
    readonly index: number;
    readonly ciphertext: Uint8Array;
  }[];
}

export interface UnsealWorkerResult {
  readonly bytes: Uint8Array;
}

export type WorkerErrorKind =
  | "argument"
  | "authentication"
  | "memory"
  | "cancelled"
  | "internal";

export type WorkerSealEvent =
  | { readonly kind: "progress"; readonly progress: WorkerProgress }
  | { readonly kind: "done"; readonly result: SealWorkerResult };

export type WorkerUnsealEvent =
  | { readonly kind: "progress"; readonly progress: WorkerProgress }
  | { readonly kind: "done"; readonly result: UnsealWorkerResult };

export interface CryptoWorkerPort {
  seal(input: SealWorkerInput, options: { readonly signal: AbortSignal }): AsyncIterable<WorkerSealEvent>;
  unseal(
    input: UnsealWorkerInput,
    options: { readonly signal: AbortSignal },
  ): AsyncIterable<WorkerUnsealEvent>;
}