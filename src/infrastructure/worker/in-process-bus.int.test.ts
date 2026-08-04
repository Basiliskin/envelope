import { describe, expect, it } from "vitest";
import { createInProcessMessageBusPair } from "./in-process-bus.js";

describe("InProcessMessageBus", () => {
  it("delivers a posted message to the peer via microtask", async () => {
    const { a, b } = createInProcessMessageBusPair();
    const received: unknown[] = [];
    a.setHandler((m) => received.push(m));
    a.start();
    b.setHandler((m) => received.push(m));
    b.start();

    b.postMessage({ kind: "cancel", id: 1 });
    await new Promise((r) => setTimeout(r, 10));

    expect(received).toEqual([
      { kind: "cancel", id: 1 },
    ]);
  });
});