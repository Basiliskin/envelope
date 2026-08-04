import { describe, expect, it } from "vitest";
import { Argon2Params } from "../../domain/credential/argon2-params.js";
import { FflateArchiveWriter } from "../archive/fflate-adapter.js";
import { createInProcessMessageBusPair } from "./in-process-bus.js";
import { WorkerClient } from "./worker-client.js";
import { WorkerHost } from "./worker-host.js";
import type { WorkerSealEvent } from "../../application/ports/worker-ports.js";
import { canonicalizeSecret, Password } from "../../domain/credential/secret.js";
import { SafeCombination } from "../../domain/credential/safe-combination.js";

function makeSecret(): Uint8Array {
  return canonicalizeSecret(
    Password.create("correct horse battery staple"),
    SafeCombination.create([37, 12, 88]),
  );
}

function pair(): { client: WorkerClient; host: WorkerHost; cleanup: () => void } {
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
    if (event.kind === "done") return event as Extract<TEvent, { kind: "done" }>;
  }
  throw new Error("Worker iteration ended without a 'done' event.");
}

describe("WorkerHost", () => {
  it(
    "seals a request delivered over the message bus",
    async () => {
      const { client, cleanup } = pair();
      try {
        const events = await collect(
          client.seal(
            {
              canonicalSecret: makeSecret(),
              entries: [{ path: "hello.txt", bytes: new Uint8Array([1, 2, 3]), mode: 0o100644 }],
              argon2: Argon2Params.MIN.toValue(),
              salt: new Uint8Array(16),
              noncePrefix: new Uint8Array(4),
              chunkSize: 1024,
            },
            { signal: new AbortController().signal },
          ),
        );
        const sealed = doneOrThrow<WorkerSealEvent>(events);
        expect(sealed.result.header.byteLength).toBe(43);
      } finally {
        cleanup();
      }
    },
    60000,
  );

  it(
    "zeroes the canonical secret buffer after deriving keys from it, on both seal and unseal",
    async () => {
      // The in-process bus (unlike a real Worker's postMessage) hands the
      // exact same array reference to the host, so we can assert on it
      // directly instead of through a spy. See M7 hardening: key material
      // must not linger in memory once it has been consumed.
      const { client, cleanup } = pair();
      try {
        const sealSecret = makeSecret();
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);
        const noncePrefix = new Uint8Array(4);
        crypto.getRandomValues(noncePrefix);

        const sealEvents = await collect(
          client.seal(
            {
              canonicalSecret: sealSecret,
              entries: [{ path: "hello.txt", bytes: new Uint8Array([1, 2, 3]), mode: 0o100644 }],
              argon2: Argon2Params.MIN.toValue(),
              salt,
              noncePrefix,
              chunkSize: 1024,
            },
            { signal: new AbortController().signal },
          ),
        );
        expect(sealSecret.every((byte) => byte === 0)).toBe(true);
        const sealed = doneOrThrow<WorkerSealEvent>(sealEvents);

        const unsealSecret = makeSecret();
        await collect(
          client.unseal(
            {
              canonicalSecret: unsealSecret,
              header: sealed.result.header,
              sealedChunks: sealed.result.chunks,
            },
            { signal: new AbortController().signal },
          ),
        );
        expect(unsealSecret.every((byte) => byte === 0)).toBe(true);
      } finally {
        cleanup();
      }
    },
    60000,
  );
});
