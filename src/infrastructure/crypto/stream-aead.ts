const AUTH_TAG_SIZE = 16;
const COUNTER_SIZE = 8;

export class AuthenticationError extends Error {
  constructor() {
    super("Unable to decrypt package.");
    this.name = "AuthenticationError";
  }
}

export interface SealedChunk {
  readonly index: number;
  readonly ciphertext: Uint8Array;
}

export interface SealStreamInput {
  readonly plaintext: Uint8Array;
  readonly contentKey: Uint8Array;
  readonly canonicalHeader: Uint8Array;
  readonly noncePrefix: Uint8Array;
  readonly chunkSize: number;
}

export interface UnsealStreamInput {
  readonly chunks: readonly SealedChunk[];
  readonly contentKey: Uint8Array;
  readonly canonicalHeader: Uint8Array;
  readonly noncePrefix: Uint8Array;
  readonly chunkSize: number;
}

export async function sealStream(
  input: SealStreamInput,
): Promise<readonly SealedChunk[]> {
  validateCommonInput(input.contentKey, input.noncePrefix, input.chunkSize);
  const key = await importAesKey(input.contentKey, ["encrypt"]);
  const count = Math.max(
    1,
    Math.ceil(input.plaintext.byteLength / input.chunkSize),
  );
  const chunks: SealedChunk[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = index * input.chunkSize;
    const plaintext = input.plaintext.slice(
      start,
      Math.min(start + input.chunkSize, input.plaintext.byteLength),
    );
    const ciphertext = await crypto.subtle.encrypt(
      buildAlgorithm(
        input.noncePrefix,
        input.canonicalHeader,
        index,
        index === count - 1,
      ),
      key,
      plaintext,
    );
    chunks.push({ index, ciphertext: new Uint8Array(ciphertext) });
  }
  return chunks;
}

export async function unsealStream(
  input: UnsealStreamInput,
): Promise<Uint8Array> {
  validateCommonInput(input.contentKey, input.noncePrefix, input.chunkSize);
  if (input.chunks.length === 0) {
    throw new AuthenticationError();
  }
  const key = await importAesKey(input.contentKey, ["decrypt"]);
  const plaintextChunks: Uint8Array[] = [];
  try {
    for (let position = 0; position < input.chunks.length; position += 1) {
      const chunk = input.chunks[position];
      if (
        chunk?.index !== position ||
        chunk.ciphertext.byteLength < AUTH_TAG_SIZE
      ) {
        throw new AuthenticationError();
      }
      const plaintext = await crypto.subtle.decrypt(
        buildAlgorithm(
          input.noncePrefix,
          input.canonicalHeader,
          chunk.index,
          position === input.chunks.length - 1,
        ),
        key,
        Uint8Array.from(chunk.ciphertext),
      );
      const bytes = new Uint8Array(plaintext);
      if (
        position < input.chunks.length - 1 &&
        bytes.byteLength !== input.chunkSize
      ) {
        throw new AuthenticationError();
      }
      plaintextChunks.push(bytes);
    }
  } catch {
    throw new AuthenticationError();
  }
  return concatenate(plaintextChunks);
}

function validateCommonInput(
  contentKey: Uint8Array,
  noncePrefix: Uint8Array,
  chunkSize: number,
): void {
  if (contentKey.byteLength !== 32) {
    throw new Error("Content key must be 32 bytes.");
  }
  if (noncePrefix.byteLength !== 4) {
    throw new Error("Nonce prefix must be 4 bytes.");
  }
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 0xffffffff) {
    throw new Error("Chunk size must be a non-zero uint32.");
  }
}

async function importAesKey(
  contentKey: Uint8Array,
  usages: readonly KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(contentKey),
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function buildAlgorithm(
  noncePrefix: Uint8Array,
  canonicalHeader: Uint8Array,
  index: number,
  isFinal: boolean,
): AesGcmParams {
  return {
    name: "AES-GCM",
    iv: Uint8Array.from(concatenate([noncePrefix, encodeCounter(index)])),
    additionalData: Uint8Array.from(
      concatenate([
        canonicalHeader,
        encodeCounter(index),
        new Uint8Array([isFinal ? 1 : 0]),
      ]),
    ),
    tagLength: 128,
  };
}

function encodeCounter(index: number): Uint8Array {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error("Chunk index must be a non-negative safe integer.");
  }
  const bytes = new Uint8Array(COUNTER_SIZE);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt(index), false);
  return bytes;
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
