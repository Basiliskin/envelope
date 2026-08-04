import type { WorkerEvent, WorkerRequest } from "./worker-protocol.js";

export interface MessageBus {
  postMessage(message: WorkerRequest | WorkerEvent, transfer?: readonly Transferable[]): void;
  setHandler(handler: MessageBusHandler): void;
  start(): void;
  close(): void;
}

export type MessageBusHandler = (message: WorkerEvent | WorkerRequest) => void;

export interface MessagePortLike {
  postMessage(message: unknown, transfer?: readonly Transferable[]): void;
  start(): void;
  close(): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
}