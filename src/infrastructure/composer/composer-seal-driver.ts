import type { PrepareSealInput } from "../../application/composer/prepare-seal.js";
import { prepareSeal } from "../../application/composer/prepare-seal.js";
import { deriveContentKey, deriveMasterKey } from "../crypto/kdf.js";
import { sealStream } from "../crypto/stream-aead.js";
import { encodeHeader } from "../crypto/header-codec.js";
import { Argon2Params } from "../../domain/credential/argon2-params.js";
import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";
import { FflateArchiveWriter } from "../archive/fflate-adapter.js";
import {
  Archive,
  type ArchiveEntryInput,
} from "../../domain/archive/archive.js";
import {
  createManifest,
  type Manifest,
} from "../../domain/archive/manifest.js";
import type {
  ArchiveWriterPort,
} from "../../application/ports/archive-ports.js";

export class ComposerSealDriver {
  private readonly writer: ArchiveWriterPort;

  constructor(writer: ArchiveWriterPort = new FflateArchiveWriter()) {
    this.writer = writer;
  }

  async seal(input: PrepareSealInput): Promise<Uint8Array> {
    const prepared = prepareSeal(input);
    if (prepared.kind !== "ready") {
      throw new Error(
        prepared.blockers.map((b) => b.message).join(" ") ||
          "Seal preparation failed.",
      );
    }
    const params = Argon2Params.create(prepared.input.argon2);
    const masterKey = await deriveMasterKey({
      secret: prepared.input.canonicalSecret,
      salt: prepared.input.salt,
      params,
    });
    const contentKey = await deriveContentKey(masterKey);
    masterKey.fill(0);

    const archive = Archive.create(
      prepared.input.entries.map((entry): ArchiveEntryInput => ({
        path: entry.path,
        bytes: entry.bytes,
        mode: entry.mode,
      })),
    );
    const manifest: Manifest = createManifest({
      entries: await Promise.all(
        archive.entries.map(async (entry) => ({
          path: entry.path,
          size: entry.bytes.byteLength,
          sha256: await sha256(entry.bytes),
          mode: entry.mode,
        })),
      ),
    });

    const plaintext = await collectPlaintext(
      this.writer,
      archive.entries,
      manifest,
      prepared.input.chunkSize,
    );

    const canonicalHeader = encodeHeader({
      argon2: params,
      salt: prepared.input.salt,
      noncePrefix: prepared.input.noncePrefix,
      chunkSize: prepared.input.chunkSize,
      chunkCount: 1,
    });
    const chunks = await sealStream({
      plaintext,
      contentKey,
      canonicalHeader,
      noncePrefix: prepared.input.noncePrefix,
      chunkSize: prepared.input.chunkSize,
    });
    contentKey.fill(0);
    plaintext.fill(0);

    const headerBytes = withChunkCount(canonicalHeader, chunks.length);
    return serializeSealedPackage(headerBytes, chunks);
  }
}

export async function calibrateArgon2(
  probeMemoryKiB: (size: number) => Promise<boolean>,
  selectPreset: (
    measured: number,
  ) => Pick<Argon2ParamsValue, "memoryKiB" | "iterations">,
): Promise<Pick<Argon2ParamsValue, "memoryKiB" | "iterations">> {
  // Largest preset first: memory is the constraint, bigger = better defense.
  for (const target of [1024 * 1024, 512 * 1024, 256 * 1024]) {
    const ok = await probeMemoryKiB(target);
    if (ok) {
      return selectPreset(target);
    }
  }
  throw new Error("Browser refused every Argon2 memory preset.");
}

async function collectPlaintext(
  writer: ArchiveWriterPort,
  entries: readonly {
    readonly path: string;
    readonly bytes: Uint8Array;
    readonly mode: number;
  }[],
  manifest: Manifest,
  chunkSize: number,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const event of writer.write(entries, manifest, { chunkSize })) {
    if (event.kind === "data") {
      parts.push(event.bytes);
    }
  }
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const view = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
  );
  return new Uint8Array(digest);
}

function withChunkCount(header: Uint8Array, chunkCount: number): Uint8Array {
  const copy = new Uint8Array(header);
  const view = new DataView(copy.buffer);
  view.setUint32(39, chunkCount, false);
  return copy;
}

function serializeSealedPackage(
  header: Uint8Array,
  chunks: readonly { index: number; ciphertext: Uint8Array }[],
): Uint8Array {
  const ordered = [...chunks].sort((a, b) => a.index - b.index);
  let total = header.byteLength;
  for (const chunk of ordered) {
    total += 4 + chunk.ciphertext.byteLength;
  }
  const output = new Uint8Array(total);
  output.set(header, 0);
  let offset = header.byteLength;
  for (const chunk of ordered) {
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, chunk.ciphertext.byteLength, false);
    output.set(lengthBytes, offset);
    offset += 4;
    output.set(chunk.ciphertext, offset);
    offset += chunk.ciphertext.byteLength;
  }
  return output;
}
