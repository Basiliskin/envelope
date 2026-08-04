import { Argon2Params } from "../../domain/credential/argon2-params.js";

export const SPK1_HEADER_SIZE = 43;
export const SPK1_VERSION = 1;
export const SPK1_SALT_SIZE = 16;
export const SPK1_NONCE_PREFIX_SIZE = 4;
export const SPK1_DEFAULT_CHUNK_SIZE = 1024 * 1024;

const MAGIC = new Uint8Array([0x53, 0x50, 0x4b, 0x31]);

export class InvalidHeaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidHeaderError";
  }
}

export interface Spk1Header {
  readonly argon2: Argon2Params;
  readonly salt: Uint8Array;
  readonly noncePrefix: Uint8Array;
  readonly chunkSize: number;
  readonly chunkCount: number;
}

export function encodeHeader(header: Spk1Header): Uint8Array {
  validateSizedBytes(header.salt, SPK1_SALT_SIZE, "Salt");
  validateSizedBytes(
    header.noncePrefix,
    SPK1_NONCE_PREFIX_SIZE,
    "Nonce prefix",
  );
  validateUint32(header.chunkSize, "Chunk size", false);
  validateUint32(header.chunkCount, "Chunk count", false);

  const bytes = new Uint8Array(SPK1_HEADER_SIZE);
  bytes.set(MAGIC, 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(4, SPK1_VERSION, false);
  view.setUint32(6, header.argon2.memoryKiB, false);
  view.setUint32(10, header.argon2.iterations, false);
  view.setUint8(14, header.argon2.parallelism);
  bytes.set(header.salt, 15);
  bytes.set(header.noncePrefix, 31);
  view.setUint32(35, header.chunkSize, false);
  view.setUint32(39, header.chunkCount, false);
  return bytes;
}

export function decodeHeader(bytes: Uint8Array): Spk1Header {
  if (bytes.byteLength !== SPK1_HEADER_SIZE) {
    throw new InvalidHeaderError(
      `SPK1 header must be ${SPK1_HEADER_SIZE} bytes.`,
    );
  }
  if (!MAGIC.every((byte, index) => bytes[index] === byte)) {
    throw new InvalidHeaderError("Invalid SPK1 magic.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(4, false) !== SPK1_VERSION) {
    throw new InvalidHeaderError("Unsupported SPK1 version.");
  }

  try {
    const argon2 = Argon2Params.create({
      memoryKiB: view.getUint32(6, false),
      iterations: view.getUint32(10, false),
      parallelism: readParallelism(view.getUint8(14)),
    });
    const chunkSize = view.getUint32(35, false);
    const chunkCount = view.getUint32(39, false);
    validateUint32(chunkSize, "Chunk size", false);
    validateUint32(chunkCount, "Chunk count", false);
    return {
      argon2,
      salt: bytes.slice(15, 31),
      noncePrefix: bytes.slice(31, 35),
      chunkSize,
      chunkCount,
    };
  } catch (error) {
    if (error instanceof InvalidHeaderError) {
      throw error;
    }
    throw new InvalidHeaderError("SPK1 header contains invalid parameters.");
  }
}

function readParallelism(value: number): 1 {
  if (value !== 1) {
    throw new InvalidHeaderError("SPK1 Argon2 parallelism must be 1.");
  }
  return value;
}

function validateSizedBytes(
  bytes: Uint8Array,
  expected: number,
  label: string,
): void {
  if (bytes.byteLength !== expected) {
    throw new InvalidHeaderError(`${label} must be ${expected} bytes.`);
  }
}

function validateUint32(
  value: number,
  label: string,
  allowZero: boolean,
): void {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(value) || value < minimum || value > 0xffffffff) {
    throw new InvalidHeaderError(`${label} must be a valid non-zero uint32.`);
  }
}
