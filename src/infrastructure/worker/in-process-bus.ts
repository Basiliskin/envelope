import type { MessageBus, MessageBusHandler } from "./message-bus.js";
import type { WorkerEvent, WorkerRequest } from "./worker-protocol.js";

interface PeerChannel {
  deliver(message: WorkerRequest | WorkerEvent): void;
}

export class InProcessMessageBus implements MessageBus {
  private handler: MessageBusHandler | null = null;
  private closed = false;

  constructor(private readonly peer: PeerChannel) {}

  postMessage(
    message: WorkerRequest | WorkerEvent,
    _transfer?: readonly Transferable[],
  ): void {
    if (this.closed) return;
    const delivery = (): void => {
      if (this.closed) return;
      this.peer.deliver(message);
    };
    queueMicrotask(delivery);
  }

  setHandler(handler: MessageBusHandler): void {
    this.handler = handler;
  }

  start(): void {
    // No-op: the in-process bus delivers synchronously through the bridge.
  }

  close(): void {
    this.closed = true;
  }

  deliver(message: WorkerRequest | WorkerEvent): void {
    if (this.closed) return;
    const handler = this.handler;
    if (handler === null) {
      throw new Error("InProcessMessageBus received a message before its handler was attached.");
    }
    handler(message);
  }
}

class Bridge {
  private endpoint: InProcessMessageBus | null = null;

  attach(bus: InProcessMessageBus): void {
    this.endpoint = bus;
  }

  deliver(message: WorkerRequest | WorkerEvent): void {
    const target = this.endpoint;
    if (target === null) {
      throw new Error("Bridge peer is not attached.");
    }
    target.deliver(message);
  }

  close(): void {
    this.endpoint?.close();
  }
}

export function createInProcessMessageBusPair(): {
  readonly a: InProcessMessageBus;
  readonly b: InProcessMessageBus;
} {
  const bridgeA = new Bridge();
  const bridgeB = new Bridge();
  const busA = new InProcessMessageBus(bridgeB);
  const busB = new InProcessMessageBus(bridgeA);
  bridgeA.attach(busA);
  bridgeB.attach(busB);
  return { a: busA, b: busB };
}