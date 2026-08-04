import type { ReaderFile, ReaderProgress } from "../../domain/reader/types.js";

export interface ReaderCryptoPort {
  unseal(input: {
    readonly canonicalSecret: Uint8Array;
    readonly header: Uint8Array;
    readonly sealedChunks: readonly {
      readonly index: number;
      readonly ciphertext: Uint8Array;
    }[];
    readonly signal: AbortSignal;
    readonly onProgress: (progress: ReaderProgress) => void;
  }): Promise<Uint8Array>;
}

export interface ReaderArchivePort {
  extract(bytes: Uint8Array, signal: AbortSignal): Promise<readonly ReaderFile[]>;
}

export interface MemoryPreflightPort {
  canAllocate(memoryKiB: number): Promise<boolean>;
}
