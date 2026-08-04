import { describe, expect, it } from "vitest";
import {
  isWorkerEvent,
  isWorkerRequest,
  WORKER_PROTOCOL_VERSION,
} from "./worker-protocol.js";

describe("WORKER_PROTOCOL_VERSION", () => {
  it("is frozen at 1", () => {
    expect(WORKER_PROTOCOL_VERSION).toBe(1);
  });
});

describe("isWorkerRequest", () => {
  it("accepts a seal request with an integer id", () => {
    expect(
      isWorkerRequest({
        kind: "seal",
        id: 1,
        argon2: { memoryKiB: 256 * 1024, iterations: 3, parallelism: 1 },
        salt: new Uint8Array(16),
        noncePrefix: new Uint8Array(4),
        chunkSize: 1024,
        canonicalSecret: new Uint8Array(8),
        entries: [],
      }),
    ).toBe(true);
  });

  it("accepts an unseal request", () => {
    expect(
      isWorkerRequest({
        kind: "unseal",
        id: 7,
        canonicalSecret: new Uint8Array(8),
        header: new Uint8Array(43),
        sealedChunks: [],
      }),
    ).toBe(true);
  });

  it("accepts a cancel request", () => {
    expect(isWorkerRequest({ kind: "cancel", id: 2 })).toBe(true);
  });

  it("rejects unknown kinds, non-integer ids, and non-objects", () => {
    expect(isWorkerRequest({ kind: "noop", id: 1 })).toBe(false);
    expect(isWorkerRequest({ kind: "seal", id: "1" })).toBe(false);
    expect(isWorkerRequest(null)).toBe(false);
    expect(isWorkerRequest("seal")).toBe(false);
    expect(isWorkerRequest([])).toBe(false);
  });
});

describe("isWorkerEvent", () => {
  it("accepts progress, sealed, unsealed, cancelled, and error events", () => {
    expect(isWorkerEvent({ kind: "progress", id: 1, phase: "kdf", current: 0, total: 3 })).toBe(true);
    expect(isWorkerEvent({ kind: "sealed", id: 1, header: new Uint8Array(43), chunks: [] })).toBe(true);
    expect(isWorkerEvent({ kind: "unsealed", id: 1, bytes: new Uint8Array(8) })).toBe(true);
    expect(isWorkerEvent({ kind: "cancelled", id: 1 })).toBe(true);
    expect(isWorkerEvent({ kind: "error", id: 1, errorKind: "argument", message: "bad" })).toBe(true);
  });

  it("rejects unknown kinds, non-integer ids, and primitives", () => {
    expect(isWorkerEvent({ kind: "noop", id: 1 })).toBe(false);
    expect(isWorkerEvent({ kind: "progress", id: "1" })).toBe(false);
    expect(isWorkerEvent(undefined)).toBe(false);
    expect(isWorkerEvent(42)).toBe(false);
  });
});