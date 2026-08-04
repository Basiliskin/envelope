import { decodeHeader, SPK1_HEADER_SIZE } from "../../infrastructure/crypto/header-codec.js";
import type { ParsedSealedPackage } from "./types.js";

const LENGTH_SIZE = 4;
const GCM_TAG_SIZE = 16;

export class InvalidSealedPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSealedPackageError";
  }
}

export function parseSealedPackage(bytes: Uint8Array): ParsedSealedPackage {
  if (bytes.byteLength < SPK1_HEADER_SIZE) {
    throw new InvalidSealedPackageError("The sealed package header is truncated.");
  }

  const header = bytes.slice(0, SPK1_HEADER_SIZE);
  let decoded: ReturnType<typeof decodeHeader>;
  try {
    decoded = decodeHeader(header);
  } catch {
    throw new InvalidSealedPackageError("The sealed package header is invalid.");
  }

  const chunks: { index: number; ciphertext: Uint8Array }[] = [];
  let offset = SPK1_HEADER_SIZE;
  for (let index = 0; index < decoded.chunkCount; index += 1) {
    if (offset + LENGTH_SIZE > bytes.byteLength) {
      throw new InvalidSealedPackageError("The sealed package is truncated.");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, LENGTH_SIZE);
    const length = view.getUint32(0, false);
    offset += LENGTH_SIZE;
    if (length < GCM_TAG_SIZE || offset + length > bytes.byteLength) {
      throw new InvalidSealedPackageError("The sealed package has an invalid chunk.");
    }
    chunks.push({ index, ciphertext: bytes.slice(offset, offset + length) });
    offset += length;
  }

  if (offset !== bytes.byteLength) {
    throw new InvalidSealedPackageError("The sealed package has trailing data.");
  }

  return {
    header,
    memoryKiB: decoded.argon2.memoryKiB,
    chunks,
  };
}
