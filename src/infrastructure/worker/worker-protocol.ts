import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";
import type { WorkerPhase } from "../../application/ports/worker-ports.js";

export const WORKER_PROTOCOL_VERSION = 1 as const;

export interface WorkerSealRequest {
  readonly kind: "seal";
  readonly id: number;
  readonly argon2: Argon2ParamsValue;
  readonly salt: Uint8Array;
  readonly noncePrefix: Uint8Array;
  readonly chunkSize: number;
  readonly canonicalSecret: Uint8Array;
  readonly entries: readonly {
    readonly path: string;
    readonly bytes: Uint8Array;
    readonly mode: number;
  }[];
}

export interface WorkerUnsealRequest {
  readonly kind: "unseal";
  readonly id: number;
  readonly canonicalSecret: Uint8Array;
  readonly header: Uint8Array;
  readonly sealedChunks: readonly {
    readonly index: number;
    readonly ciphertext: Uint8Array;
  }[];
}

export interface WorkerCancelRequest {
  readonly kind: "cancel";
  readonly id: number;
}

export type WorkerRequest =
  | WorkerSealRequest
  | WorkerUnsealRequest
  | WorkerCancelRequest;

export interface WorkerProgressEvent {
  readonly kind: "progress";
  readonly id: number;
  readonly phase: WorkerPhase;
  readonly current: number;
  readonly total: number;
}

export interface WorkerSealResultEvent {
  readonly kind: "sealed";
  readonly id: number;
  readonly header: Uint8Array;
  readonly chunks: readonly {
    readonly index: number;
    readonly ciphertext: Uint8Array;
  }[];
}

export interface WorkerUnsealResultEvent {
  readonly kind: "unsealed";
  readonly id: number;
  readonly bytes: Uint8Array;
}

export interface WorkerCancelledEvent {
  readonly kind: "cancelled";
  readonly id: number;
}

export interface WorkerErrorEvent {
  readonly kind: "error";
  readonly id: number;
  readonly errorKind: "argument" | "authentication" | "memory" | "internal";
  readonly message: string;
}

export type WorkerEvent =
  | WorkerProgressEvent
  | WorkerSealResultEvent
  | WorkerUnsealResultEvent
  | WorkerCancelledEvent
  | WorkerErrorEvent;

export function isWorkerRequest(value: unknown): value is WorkerRequest {
  if (!isObject(value)) return false;
  const kind = value.kind;
  if (kind === "seal" || kind === "unseal" || kind === "cancel") {
    return Number.isInteger(value.id);
  }
  return false;
}

export function isWorkerEvent(value: unknown): value is WorkerEvent {
  if (!isObject(value)) return false;
  const kind = value.kind;
  switch (kind) {
    case "progress":
    case "sealed":
    case "unsealed":
    case "cancelled":
    case "error":
      return Number.isInteger(value.id);
    default:
      return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}