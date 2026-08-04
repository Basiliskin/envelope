import { describe, expect, it } from "vitest";
import { Argon2Params } from "../../domain/credential/argon2-params.js";
import { FflateArchiveWriter } from "../archive/fflate-adapter.js";
import { createInProcessMessageBusPair } from "./in-process-bus.js";
import { WorkerClient } from "./worker-client.js";
import { WorkerHost } from "./worker-host.js";
import type {
  WorkerSealEvent,
  WorkerUnsealEvent,
} from "../../application/ports/worker-ports.js";
import { canonicalizeSecret, Password } from "../../domain/credential/secret.js";
import { SafeCombination } from "../../domain/credential/safe-combination.js";
import { SPK1_DEFAULT_CHUNK_SIZE } from "../crypto/header-codec.js";

function makeSecret(): Uint8Array {
  return canonicalizeSecret(
    Password.create("correct horse battery staple"),
    SafeCombination.create([37, 12, 88]),
  );
}

function pair(): {
  client: WorkerClient;
  host: WorkerHost;
  cleanup: () => void;
} {
  const { a, b } = createInProcessMessageBusPair();
  const client = new WorkerClient(a);
  const host = new WorkerHost(b, { writer: new FflateArchiveWriter() });
  client.start();
  host.start();
  return {
    client,
    host,
    cleanup: () => {
      client.stop();
      host.stop();
    },
  };
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

function doneOrThrow<TEvent extends { kind: string }>(
  events: readonly TEvent[],
): Extract<TEvent, { kind: "done" }> {
  for (const event of events) {
    if (event.kind === "done") {
      return event as Extract<TEvent, { kind: "done" }>;
    }
  }
  throw new Error("Worker iteration ended without a 'done' event.");
}

describe("WorkerClient + WorkerHost (in-process)", () => {
  it(
    "round-trips a small envelope through the seal/unseal protocol",
    async () => {
      const { client, cleanup } = pair();
      try {
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);
        const noncePrefix = new Uint8Array(4);
        crypto.getRandomValues(noncePrefix);

        const sealEvents = await collect(
          client.seal(
            {
              canonicalSecret: makeSecret(),
              entries: [
                { path: "hello.txt", bytes: new TextEncoder().encode("hello world"), mode: 0o100644 },
                { path: "data.bin", bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), mode: 0o100644 },
              ],
              argon2: Argon2Params.MIN.toValue(),
              salt,
              noncePrefix,
              chunkSize: 1024,
            },
            { signal: new AbortController().signal },
          ),
        );

        const sealed = doneOrThrow<WorkerSealEvent>(sealEvents);
        expect(sealed.result.header.byteLength).toBe(43);
        expect(sealed.result.chunks.length).toBeGreaterThan(0);

        const unsealEvents = await collect(
          client.unseal(
            {
              canonicalSecret: makeSecret(),
              header: sealed.result.header,
              sealedChunks: sealed.result.chunks,
            },
            { signal: new AbortController().signal },
          ),
        );
        const unsealed = doneOrThrow<WorkerUnsealEvent>(unsealEvents);
        const text = new TextDecoder().decode(unsealed.result.bytes);
        expect(text).toContain("hello world");
      } finally {
        cleanup();
      }
    },
    60000,
  );

  it(
    "emits KDF and seal progress before the sealed event",
    async () => {
      const { client, cleanup } = pair();
      try {
        const events = await collect(
          client.seal(
            {
              canonicalSecret: makeSecret(),
              entries: [{ path: "tiny.txt", bytes: new Uint8Array([1]), mode: 0o100644 }],
              argon2: Argon2Params.MIN.toValue(),
              salt: new Uint8Array(16),
              noncePrefix: new Uint8Array(4),
              chunkSize: SPK1_DEFAULT_CHUNK_SIZE,
            },
            { signal: new AbortController().signal },
          ),
        );
        const phases = events
          .filter((e): e is Extract<WorkerSealEvent, { kind: "progress" }> => e.kind === "progress")
          .map((e) => e.progress.phase);
        expect(phases).toContain("kdf");
        expect(phases).toContain("seal");
      } finally {
        cleanup();
      }
    },
    60000,
  );

  it(
    "throws a WorkerClientError on authentication failure during unseal",
    async () => {
      const { client, cleanup } = pair();
      try {
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);
        const noncePrefix = new Uint8Array(4);
        crypto.getRandomValues(noncePrefix);

        const sealEvents = await collect(
          client.seal(
            {
              canonicalSecret: makeSecret(),
              entries: [{ path: "secret.txt", bytes: new TextEncoder().encode("sensitive data"), mode: 0o100644 }],
              argon2: Argon2Params.MIN.toValue(),
              salt,
              noncePrefix,
              chunkSize: 256,
            },
            { signal: new AbortController().signal },
          ),
        );
        const sealed = doneOrThrow<WorkerSealEvent>(sealEvents);

        const wrongSecret = canonicalizeSecret(
          Password.create("wrong password"),
          SafeCombination.create([37, 12, 88]),
        );

        await expect(
          collect(
            client.unseal(
              {
                canonicalSecret: wrongSecret,
                header: sealed.result.header,
                sealedChunks: sealed.result.chunks,
              },
              { signal: new AbortController().signal },
            ),
          ),
        ).rejects.toThrow();
      } finally {
        cleanup();
      }
    },
    60000,
  );

  it(
    "transfers buffers as zero-copy where the bus permits",
    async () => {
      const seen: { kind: string; byteLength: number }[] = [];
      const { a, b } = createInProcessMessageBusPair();
      const originalPostA = a.postMessage.bind(a);
      a.postMessage = (message, transfer): void => {
        if (typeof message === "object" && message !== null && "kind" in message) {
          seen.push({
            kind: (message as { kind: string }).kind,
            byteLength: transfer?.length ?? 0,
          });
        }
        originalPostA(message, transfer);
      };

      const client = new WorkerClient(a);
      const host = new WorkerHost(b, { writer: new FflateArchiveWriter() });
      client.start();
      host.start();
      try {
        await collect(
          client.seal(
            {
              canonicalSecret: makeSecret(),
              entries: [{ path: "x.bin", bytes: new Uint8Array([0xff]), mode: 0o100644 }],
              argon2: Argon2Params.MIN.toValue(),
              salt: new Uint8Array(16),
              noncePrefix: new Uint8Array(4),
              chunkSize: 256,
            },
            { signal: new AbortController().signal },
          ),
        );
        const sealSend = seen.find((entry) => entry.kind === "seal");
        expect(sealSend).toBeDefined();
        if (sealSend === undefined) throw new Error("no seal send observed");
        expect(sealSend.byteLength).toBeGreaterThan(0);
      } finally {
        client.stop();
        host.stop();
      }
    },
    60000,
  );
});

describe("WorkerClient cancellation", () => {
  it("aborts the iterable when the supplied signal fires", async () => {
    const { client, cleanup } = pair();
    try {
      const controller = new AbortController();
      const iterable = client.seal(
        {
          canonicalSecret: makeSecret(),
          entries: [{ path: "f.txt", bytes: new Uint8Array(64 * 1024), mode: 0o100644 }],
          argon2: Argon2Params.MAX.toValue(),
          salt: new Uint8Array(16),
          noncePrefix: new Uint8Array(4),
          chunkSize: 1024,
        },
        { signal: controller.signal },
      );
      const iterator = iterable[Symbol.asyncIterator]();
      const first = await iterator.next();
      expect(first.done).toBe(false);
      controller.abort();
      await expect(iterator.next()).rejects.toThrow();
    } finally {
      cleanup();
    }
  });
});