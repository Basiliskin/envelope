import { canonicalizeSecret, Password } from "../../domain/credential/secret.js";
import { SafeCombination } from "../../domain/credential/safe-combination.js";
import { parseSealedPackage } from "../../domain/reader/sealed-package.js";
import type {
  ReaderCredential,
  ReaderFile,
  ReaderProgress,
} from "../../domain/reader/types.js";
import type {
  MemoryPreflightPort,
  ReaderArchivePort,
  ReaderCryptoPort,
} from "./reader-ports.js";

export class ReaderMemoryError extends Error {
  constructor(memoryKiB: number) {
    super(
      `This file needs ${formatMemory(memoryKiB)} of Argon2 memory and your browser refused it. Close some tabs and try again.`,
    );
    this.name = "ReaderMemoryError";
  }
}

export class UnsealPackage {
  constructor(
    private readonly memory: MemoryPreflightPort,
    private readonly crypto: ReaderCryptoPort,
    private readonly archive: ReaderArchivePort,
  ) {}

  async preflight(packageBytes: Uint8Array): Promise<void> {
    const parsed = parseSealedPackage(packageBytes);
    if (!(await this.memory.canAllocate(parsed.memoryKiB))) {
      throw new ReaderMemoryError(parsed.memoryKiB);
    }
  }

  async execute(input: {
    readonly packageBytes: Uint8Array;
    readonly credential: ReaderCredential;
    readonly signal: AbortSignal;
    readonly onProgress: (progress: ReaderProgress) => void;
  }): Promise<readonly ReaderFile[]> {
    const parsed = parseSealedPackage(input.packageBytes);
    const combination = SafeCombination.create(input.credential.combination);
    const canonicalSecret = canonicalizeSecret(
      Password.create(input.credential.password),
      combination,
    );
    try {
      const archiveBytes = await this.crypto.unseal({
        canonicalSecret,
        header: parsed.header,
        sealedChunks: parsed.chunks,
        signal: input.signal,
        onProgress: input.onProgress,
      });
      input.onProgress({ phase: "extract", current: 0, total: 1 });
      const files = await this.archive.extract(archiveBytes, input.signal);
      input.onProgress({ phase: "extract", current: 1, total: 1 });
      return files;
    } finally {
      canonicalSecret.fill(0);
    }
  }
}

function formatMemory(memoryKiB: number): string {
  const memoryMiB = memoryKiB / 1024;
  if (memoryMiB >= 1024) return `${String(memoryMiB / 1024)} GiB`;
  return `${String(memoryMiB)} MiB`;
}
