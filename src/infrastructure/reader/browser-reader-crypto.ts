import type { ReaderCryptoPort } from "../../application/reader/reader-ports.js";
import { deriveContentKey, deriveMasterKey } from "../crypto/kdf.js";
import { decodeHeader } from "../crypto/header-codec.js";
import { unsealStream } from "../crypto/stream-aead.js";

export class BrowserReaderCrypto implements ReaderCryptoPort {
  async unseal(input: Parameters<ReaderCryptoPort["unseal"]>[0]): Promise<Uint8Array> {
    const header = decodeHeader(input.header);
    if (header.chunkCount !== input.sealedChunks.length) {
      throw new Error("Unable to open package.");
    }
    input.onProgress({
      phase: "kdf",
      current: 0,
      total: header.argon2.iterations,
    });
    const masterKey = await deriveMasterKey({
      secret: input.canonicalSecret,
      salt: header.salt,
      params: header.argon2,
    });
    try {
      if (input.signal.aborted) throw new Error("Operation cancelled.");
      input.onProgress({
        phase: "kdf",
        current: header.argon2.iterations,
        total: header.argon2.iterations,
      });
      const contentKey = await deriveContentKey(masterKey);
      try {
        input.onProgress({
          phase: "unseal",
          current: 0,
          total: input.sealedChunks.length,
        });
        const bytes = await unsealStream({
          chunks: input.sealedChunks,
          contentKey,
          canonicalHeader: input.header,
          noncePrefix: header.noncePrefix,
          chunkSize: header.chunkSize,
        });
        input.onProgress({
          phase: "unseal",
          current: input.sealedChunks.length,
          total: input.sealedChunks.length,
        });
        return bytes;
      } finally {
        contentKey.fill(0);
      }
    } finally {
      masterKey.fill(0);
    }
  }
}
