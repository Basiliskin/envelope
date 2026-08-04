import type { MessageBus, MessageBusHandler, MessagePortLike } from "./message-bus.js";
import type { WorkerEvent, WorkerRequest } from "./worker-protocol.js";
import { isWorkerEvent, isWorkerRequest } from "./worker-protocol.js";

export class PostMessageMessageBus implements MessageBus {
  private handler: MessageBusHandler | null = null;

  constructor(private readonly port: MessagePortLike) {}

  postMessage(message: WorkerRequest | WorkerEvent, transfer?: readonly Transferable[]): void {
    this.port.postMessage(message, transfer);
  }

  setHandler(handler: MessageBusHandler): void {
    this.handler = handler;
    this.port.addEventListener("message", (event: { data: unknown }) => {
      const data = event.data;
      if (isWorkerRequest(data) || isWorkerEvent(data)) {
        this.handler?.(data);
      }
    });
  }

  start(): void {
    this.port.start();
  }

  close(): void {
    this.port.close();
  }
}