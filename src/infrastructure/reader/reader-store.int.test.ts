import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnsealPackage } from "../../application/reader/unseal-package.js";
import type {
  MemoryPreflightPort,
  ReaderArchivePort,
  ReaderCryptoPort,
} from "../../application/reader/reader-ports.js";
import { ReaderStore } from "./reader-store.js";
import { Argon2Params } from "../../domain/credential/argon2-params.js";
import { encodeHeader } from "../crypto/header-codec.js";

function memory(allowed: boolean): MemoryPreflightPort {
  return { canAllocate: () => Promise.resolve(allowed) };
}

function cryptoPort(behavior: "succeed" | "fail"): ReaderCryptoPort {
  return {
    unseal:
      behavior === "succeed"
        ? () => Promise.resolve(new Uint8Array([1]))
        : () => Promise.reject(new Error("Unable to decrypt package.")),
  };
}

function archivePort(): ReaderArchivePort {
  return {
    extract: (bytes) =>
      Promise.resolve([{ path: "note.txt", bytes, mode: 0o100644 }]),
  };
}

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

function armedStore(options: {
  readonly memoryOk?: boolean;
  readonly cryptoBehavior?: "succeed" | "fail";
  readonly now?: () => number;
}): ReaderStore {
  const store = new ReaderStore(
    packageBytes(),
    new UnsealPackage(
      memory(options.memoryOk ?? true),
      cryptoPort(options.cryptoBehavior ?? "succeed"),
      archivePort(),
    ),
    options.now,
  );
  store.setPassword("correct horse battery staple");
  store.setDialPosition(1, 37);
  store.setDialPosition(2, 12);
  store.setDialPosition(3, 88);
  store.lockDial();
  return store;
}

describe("ReaderStore", () => {
  it("moves from preflighting to ready when the memory check passes", async () => {
    const store = armedStore({ memoryOk: true });
    await store.preflight();
    expect(store.state).toBe("ready");
  });

  it("fails preflight with a revealed, specific message", async () => {
    const store = armedStore({ memoryOk: false });
    await store.preflight();
    expect(store.state).toBe("error");
    expect(store.error).toMatch(/browser refused/);
  });

  it("canUnseal requires a ready state, a password, and a locked dial", async () => {
    const store = armedStore({ memoryOk: true });
    expect(store.canUnseal).toBe(false);
    await store.preflight();
    expect(store.canUnseal).toBe(true);
  });

  it("unseal populates files on success and resets the attempt counter", async () => {
    const store = armedStore({ memoryOk: true, cryptoBehavior: "succeed" });
    await store.preflight();
    await store.unseal();
    expect(store.state).toBe("done");
    expect(store.files).toHaveLength(1);
    expect(store.failedAttempts).toBe(0);
  });

  it("unseal failure reports the same generic message regardless of cause", async () => {
    const store = armedStore({ memoryOk: true, cryptoBehavior: "fail" });
    await store.preflight();
    await store.unseal();
    expect(store.state).toBe("error");
    expect(store.error).toBe(
      "Unable to open package. Check your password and safe combination.",
    );
  });

  it("gives no partial-credit signal — wrong password, wrong dial, and corrupted ciphertext read identically", async () => {
    // Threat model: "Wrong password and wrong dial produce the same generic
    // error — no partial-credit signal." A discriminating message would
    // hand an attacker a free oracle for one of the two secret components.
    const reasons = [
      new Error("Unable to decrypt package."), // AuthenticationError shape
      new Error("The sealed package has an invalid chunk."),
      new TypeError("something unrelated blew up"),
    ];
    const messages = await Promise.all(
      reasons.map(async (reason) => {
        const store = new ReaderStore(
          packageBytes(),
          new UnsealPackage(
            memory(true),
            { unseal: () => Promise.reject(reason) },
            archivePort(),
          ),
        );
        store.setPassword("correct horse battery staple");
        store.setDialPosition(1, 37);
        store.setDialPosition(2, 12);
        store.setDialPosition(3, 88);
        store.lockDial();
        await store.preflight();
        await store.unseal();
        return store.error;
      }),
    );
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toBe(
      "Unable to open package. Check your password and safe combination.",
    );
  });
});

describe("ReaderStore backoff (convenience only, not security)", () => {
  let clockMs = 0;
  const now = (): number => clockMs;

  beforeEach(() => {
    clockMs = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks the next attempt for an exponentially increasing delay per failure", async () => {
    const store = armedStore({ memoryOk: true, cryptoBehavior: "fail", now });
    await store.preflight();

    await store.unseal();
    expect(store.failedAttempts).toBe(1);
    expect(store.backoffRemainingMs).toBe(1000);
    expect(store.canUnseal).toBe(false);

    clockMs += 1000;
    expect(store.backoffRemainingMs).toBe(0);
    expect(store.canUnseal).toBe(true);

    await store.unseal();
    expect(store.failedAttempts).toBe(2);
    expect(store.backoffRemainingMs).toBe(2000);
  });

  it("does not attempt to unseal again while backed off", async () => {
    const attempts: number[] = [];
    const store = new ReaderStore(
      packageBytes(),
      new UnsealPackage(
        memory(true),
        {
          unseal: () => {
            attempts.push(1);
            return Promise.reject(new Error("Unable to decrypt package."));
          },
        },
        archivePort(),
      ),
      now,
    );
    store.setPassword("correct horse battery staple");
    store.setDialPosition(1, 37);
    store.setDialPosition(2, 12);
    store.setDialPosition(3, 88);
    store.lockDial();
    await store.preflight();

    await store.unseal();
    expect(attempts).toHaveLength(1);
    await store.unseal(); // still backed off — canUnseal is false, so this is a no-op
    expect(attempts).toHaveLength(1);
  });

  it("notifies subscribers once the backoff window elapses", async () => {
    const store = armedStore({ memoryOk: true, cryptoBehavior: "fail", now });
    await store.preflight();
    await store.unseal();

    let notified = false;
    store.subscribe(() => {
      notified = true;
    });
    clockMs += 1000;
    vi.advanceTimersByTime(1000);
    expect(notified).toBe(true);
  });
});
