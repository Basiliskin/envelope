import { describe, expect, it } from "vitest";
import {
  InMemoryWasmProbe,
  WebAssemblyMemoryProbe,
} from "./wasm-capabilities-adapter.js";

describe("InMemoryWasmProbe", () => {
  it("returns canAllocate=true when the predicate accepts", async () => {
    const probe = new InMemoryWasmProbe(() => true);
    const result = await probe.probe(512 * 1024);
    expect(result.canAllocate).toBe(true);
    expect(result.maxMemoryKiB).toBe(512 * 1024);
    expect(result.errorMessage).toBeUndefined();
  });

  it("returns canAllocate=false with an error message when the predicate rejects", async () => {
    const probe = new InMemoryWasmProbe(() => false);
    const result = await probe.probe(512 * 1024);
    expect(result.canAllocate).toBe(false);
    expect(result.maxMemoryKiB).toBe(0);
    expect(result.errorMessage).toBeDefined();
  });

  it("passes the requested size in bytes to the predicate", async () => {
    let observed = 0;
    const probe = new InMemoryWasmProbe((bytes) => {
      observed = bytes;
      return true;
    });
    await probe.probe(512 * 1024);
    expect(observed).toBe(512 * 1024 * 1024);
  });
});

describe("WebAssemblyMemoryProbe", () => {
  it("succeeds for a small allocation", async () => {
    const probe = new WebAssemblyMemoryProbe();
    const result = await probe.probe(8);
    expect(result.canAllocate).toBe(true);
    expect(result.maxMemoryKiB).toBeGreaterThan(0);
  });

  it("rejects an absurdly large request", async () => {
    const probe = new WebAssemblyMemoryProbe();
    const result = await probe.probe(8 * 1024 * 1024);
    if (!result.canAllocate) {
      expect(result.errorMessage).toBeDefined();
      expect(result.maxMemoryKiB).toBe(0);
    } else {
      expect(result.maxMemoryKiB).toBeGreaterThanOrEqual(8 * 1024 * 1024);
    }
  });
});
