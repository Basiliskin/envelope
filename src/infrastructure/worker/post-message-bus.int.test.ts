import { describe, expect, it } from "vitest";
import { PostMessageMessageBus } from "./post-message-bus.js";
import type { MessagePortLike } from "./message-bus.js";

interface PortRecord {
  readonly message: unknown;
  readonly transfer?: readonly Transferable[];
}

class FakePort implements MessagePortLike {
  private listener: ((event: { data: unknown }) => void) | null = null;
  public posted: PortRecord[] = [];
  postMessage(message: unknown, transfer?: readonly Transferable[]): void {
    if (transfer !== undefined) {
      this.posted.push({ message, transfer });
    } else {
      this.posted.push({ message });
    }
  }
  start(): void {
    // The fake port delivers messages synchronously; no-op start.
  }
  close(): void {
    // No-op: no resources to release for the fake port.
  }
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void {
    if (type === "message") this.listener = listener;
  }
  deliver(message: unknown): void {
    if (this.listener !== null) this.listener({ data: message });
  }
}

describe("PostMessageMessageBus", () => {
  it("forwards messages to the underlying port", () => {
    const port = new FakePort();
    const bus = new PostMessageMessageBus(port);
    bus.postMessage({ kind: "sealed", id: 1, header: new Uint8Array(0), chunks: [] });
    expect(port.posted).toHaveLength(1);
    expect(port.posted[0]?.message).toEqual({
      kind: "sealed",
      id: 1,
      header: new Uint8Array(0),
      chunks: [],
    });
  });

  it("filters out non-protocol messages received via the port", () => {
    const port = new FakePort();
    const bus = new PostMessageMessageBus(port);
    const received: unknown[] = [];
    bus.setHandler((message) => received.push(message));
    bus.start();
    port.deliver({ kind: "sealed", id: 7, header: new Uint8Array(0), chunks: [] });
    port.deliver({ kind: "progress", id: 8, phase: "kdf", current: 0, total: 3 });
    port.deliver({ kind: "garbage", id: 9 });
    expect(received).toHaveLength(2);
    expect(received.map((e) => (e as { kind: string }).kind)).toEqual(["sealed", "progress"]);
  });
});