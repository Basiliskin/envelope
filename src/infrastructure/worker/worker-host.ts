import { Argon2Params } from "../../domain/credential/argon2-params.js";
import { deriveContentKey, deriveMasterKey } from "../crypto/kdf.js";
import {
  AuthenticationError,
  sealStream,
  unsealStream,
} from "../crypto/stream-aead.js";
import {
  decodeHeader,
  encodeHeader,
} from "../crypto/header-codec.js";
import { Archive, type ArchiveEntryInput } from "../../domain/archive/archive.js";
import {
  createManifest,
  type Manifest,
} from "../../domain/archive/manifest.js";
import type { MessageBus } from "./message-bus.js";
import type {
  WorkerEvent,
  WorkerRequest,
} from "./worker-protocol.js";
import { isWorkerRequest } from "./worker-protocol.js";
import type { FflateArchiveWriter } from "../archive/fflate-adapter.js";

export interface WorkerHostOptions {
  readonly writer: FflateArchiveWriter;
}

export class WorkerHost {
  private readonly pending = new Map<number, AbortController>();
  private started = false;

  constructor(
    private readonly bus: MessageBus,
    private readonly options: WorkerHostOptions,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.bus.setHandler((message) => {
      if (!isWorkerRequest(message)) return;
      void this.handleRequest(message);
    });
    this.bus.start();
  }

  stop(): void {
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear();
    this.bus.close();
  }

  private async handleRequest(request: WorkerRequest): Promise<void> {
    if (request.kind === "cancel") {
      const controller = this.pending.get(request.id);
      if (controller !== undefined) {
        controller.abort();
      }
      return;
    }
    const controller = new AbortController();
    this.pending.set(request.id, controller);
    try {
      if (request.kind === "seal") {
        await this.runSeal(request.id, request, controller.signal);
      } else if (request.kind === "unseal") {
        await this.runUnseal(request.id, request, controller.signal);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        this.send({ kind: "cancelled", id: request.id });
        return;
      }
      this.send({
        kind: "error",
        id: request.id,
        errorKind: classifyError(error),
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.pending.delete(request.id);
    }
  }

  private async runSeal(
    id: number,
    request: Extract<WorkerRequest, { kind: "seal" }>,
    signal: AbortSignal,
  ): Promise<void> {
    const params = Argon2Params.create(request.argon2);
    this.ensureSalt(request.salt);
    this.ensureNoncePrefix(request.noncePrefix);
    this.ensureChunkSize(request.chunkSize);
    throwIfAborted(signal);
    this.send({
      kind: "progress",
      id,
      phase: "kdf",
      current: 0,
      total: request.argon2.iterations,
    });
    const masterKey = await deriveMasterKey({
      secret: request.canonicalSecret,
      salt: request.salt,
      params,
    });
    throwIfAborted(signal);
    this.send({
      kind: "progress",
      id,
      phase: "kdf",
      current: request.argon2.iterations,
      total: request.argon2.iterations,
    });
    const contentKey = await deriveContentKey(masterKey);
    zeroOut(masterKey);
    throwIfAborted(signal);
    const archive = Archive.create(
      request.entries.map(
        (entry): ArchiveEntryInput => ({
          path: entry.path,
          bytes: entry.bytes,
          mode: entry.mode,
        }),
      ),
    );
    const manifest = await buildManifest(archive);
    const plaintext = await collectPlaintext(
      this.options.writer,
      archive,
      manifest,
      request.chunkSize,
      signal,
    );
    throwIfAborted(signal);
    this.send({ kind: "progress", id, phase: "seal", current: 0, total: 1 });
    const canonicalHeader = encodeHeader({
      argon2: params,
      salt: request.salt,
      noncePrefix: request.noncePrefix,
      chunkSize: request.chunkSize,
      chunkCount: 1,
    });
    const chunks = await sealStream({
      plaintext,
      contentKey,
      canonicalHeader,
      noncePrefix: request.noncePrefix,
      chunkSize: request.chunkSize,
    });
    const headerBytes = withChunkCount(canonicalHeader, chunks.length);
    this.send({
      kind: "sealed",
      id,
      header: transfer(headerBytes),
      chunks: chunks.map((chunk) => ({
        index: chunk.index,
        ciphertext: transfer(chunk.ciphertext),
      })),
    });
    zeroOut(contentKey);
    zeroOut(plaintext);
  }

  private async runUnseal(
    id: number,
    request: Extract<WorkerRequest, { kind: "unseal" }>,
    signal: AbortSignal,
  ): Promise<void> {
    const header = decodeHeader(request.header);
    const params = header.argon2;
    throwIfAborted(signal);
    this.send({ kind: "progress", id, phase: "kdf", current: 0, total: params.iterations });
    const masterKey = await deriveMasterKey({
      secret: request.canonicalSecret,
      salt: header.salt,
      params,
    });
    throwIfAborted(signal);
    this.send({
      kind: "progress",
      id,
      phase: "kdf",
      current: params.iterations,
      total: params.iterations,
    });
    const contentKey = await deriveContentKey(masterKey);
    zeroOut(masterKey);
    throwIfAborted(signal);
    const headerBytes = encodeHeader(header);
    this.send({ kind: "progress", id, phase: "unseal", current: 0, total: 1 });
    const plaintext = await unsealStream({
      chunks: request.sealedChunks.map((chunk) => ({
        index: chunk.index,
        ciphertext: chunk.ciphertext,
      })),
      contentKey,
      canonicalHeader: headerBytes,
      noncePrefix: header.noncePrefix,
      chunkSize: header.chunkSize,
    });
    zeroOut(contentKey);
    this.send({ kind: "unsealed", id, bytes: transfer(plaintext) });
  }

  private send(event: WorkerEvent): void {
    this.bus.postMessage(event, transferList(event));
  }

  private ensureSalt(salt: Uint8Array): void {
    if (salt.byteLength !== 16) {
      throw new Error("Salt must be 16 bytes.");
    }
  }

  private ensureNoncePrefix(noncePrefix: Uint8Array): void {
    if (noncePrefix.byteLength !== 4) {
      throw new Error("Nonce prefix must be 4 bytes.");
    }
  }

  private ensureChunkSize(chunkSize: number): void {
    if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 0xffffffff) {
      throw new Error("Chunk size must be a positive uint32.");
    }
  }
}

async function buildManifest(archive: Archive): Promise<Manifest> {
  const entries = await Promise.all(
    archive.entries.map(async (entry) => ({
      path: entry.path,
      size: entry.bytes.byteLength,
      sha256: await sha256(entry.bytes),
      mode: entry.mode,
    })),
  );
  return createManifest({ entries });
}

async function collectPlaintext(
  writer: FflateArchiveWriter,
  archive: Archive,
  manifest: Manifest,
  chunkSize: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const event of writer.write(archive.entries, manifest, {
    chunkSize,
    signal,
  })) {
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

function classifyError(error: unknown): "argument" | "authentication" | "memory" | "internal" {
  if (error instanceof AuthenticationError) return "authentication";
  if (error instanceof Error && /memory|allocate|allocate/i.test(error.message)) {
    return "memory";
  }
  if (error instanceof Error && /byte|chunk|salt|nonce|argon2|argument/i.test(error.message)) {
    return "argument";
  }
  return "internal";
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new Error("Operation cancelled.");
  }
}

function zeroOut(bytes: Uint8Array): void {
  bytes.fill(0);
}

function transfer(value: Uint8Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function transferList(event: WorkerEvent): readonly Transferable[] {
  if (event.kind === "sealed") {
    return [event.header.buffer, ...event.chunks.map((chunk) => chunk.ciphertext.buffer)];
  }
  if (event.kind === "unsealed") {
    return [event.bytes.buffer];
  }
  return [];
}

function withChunkCount(header: Uint8Array, chunkCount: number): Uint8Array {
  if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 0xffffffff) {
    throw new Error("Chunk count must be a positive uint32.");
  }
  const copy = new Uint8Array(header);
  const view = new DataView(copy.buffer);
  view.setUint32(39, chunkCount, false);
  return copy;
}