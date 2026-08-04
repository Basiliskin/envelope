import type { SafeCombinationValue } from "../credential/safe-combination.js";

export interface ReaderCredential {
  readonly password: string;
  readonly combination: SafeCombinationValue;
}

export interface ParsedSealedPackage {
  readonly header: Uint8Array;
  readonly memoryKiB: number;
  readonly chunks: readonly {
    readonly index: number;
    readonly ciphertext: Uint8Array;
  }[];
}

export interface ReaderFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mode: number;
}

export type ReaderProgressPhase = "kdf" | "unseal" | "extract";

export interface ReaderProgress {
  readonly phase: ReaderProgressPhase;
  readonly current: number;
  readonly total: number;
}
