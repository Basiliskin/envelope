import { describe, expect, it } from "vitest";
import { Argon2Params } from "../../domain/credential/argon2-params.js";
import { encodeHeader } from "../../infrastructure/crypto/header-codec.js";
import type { ReaderProgress } from "../../domain/reader/types.js";
import type {
  MemoryPreflightPort,
  ReaderArchivePort,
  ReaderCryptoPort,
} from "./reader-ports.js";
import { ReaderMemoryError, UnsealPackage } from "./unseal-package.js";

function packageBytes(): Uint8Array {
  const header = encodeHeader({
    argon2: Argon2Params.MIN,
    salt: new Uint8Array(16),
    noncePrefix: new Uint8Array(4),
    chunkSize: 1024,
    chunkCount: 1,
  });
  const output = new Uint8Array(header.byteLength + 20);
  output.set(header);
  new DataView(output.buffer).setUint32(header.byteLength, 16, false);
  return output;
}

const memory = (allowed: boolean): MemoryPreflightPort => ({
  canAllocate: () => Promise.resolve(allowed),
});

describe("UnsealPackage", () => {
  it("runs memory preflight before credentials are needed", async () => {
    await expect(
      new UnsealPackage(memory(false), unusedCrypto(), unusedArchive()).preflight(
        packageBytes(),
      ),
    ).rejects.toBeInstanceOf(ReaderMemoryError);
  });

  it("canonicalizes credentials, reports progress, and extracts files", async () => {
    const progress: ReaderProgress[] = [];
    let capturedSecret = "";
    const crypto: ReaderCryptoPort = {
      unseal: (input) => {
        capturedSecret = new TextDecoder().decode(input.canonicalSecret);
        input.onProgress({ phase: "kdf", current: 1, total: 3 });
        return Promise.resolve(new Uint8Array([9]));
      },
    };
    const archive: ReaderArchivePort = {
      extract: (bytes) =>
        Promise.resolve([{ path: "note.txt", bytes, mode: 0o100644 }]),
    };
    const useCase = new UnsealPackage(memory(true), crypto, archive);

    const files = await useCase.execute({
      packageBytes: packageBytes(),
      credential: { password: "password", combination: [37, 12, 88] },
      signal: new AbortController().signal,
      onProgress: (event) => progress.push(event),
    });

    expect(capturedSecret).toBe(
      "SPK1\0password\0R1:CW:37|R2:CCW:12|R3:CW:88",
    );
    expect(files[0]?.path).toBe("note.txt");
    expect(progress).toEqual([
      { phase: "kdf", current: 1, total: 3 },
      { phase: "extract", current: 0, total: 1 },
      { phase: "extract", current: 1, total: 1 },
    ]);
  });
});

function unusedCrypto(): ReaderCryptoPort {
  return {
    unseal: () => Promise.reject(new Error("Unexpected crypto call.")),
  };
}

function unusedArchive(): ReaderArchivePort {
  return {
    extract: () => Promise.reject(new Error("Unexpected archive call.")),
  };
}
