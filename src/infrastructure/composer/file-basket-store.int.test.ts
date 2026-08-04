import { describe, expect, it } from "vitest";
import { autorun } from "mobx";
import { FileBasketStore } from "./file-basket-store.js";

const entry = (id: string, path: string, size: number) => ({
  id,
  path,
  size,
  content: new Uint8Array(size),
});

describe("FileBasketStore", () => {
  it("starts empty", () => {
    const store = new FileBasketStore();
    expect(store.entries).toEqual([]);
    expect(store.totalBytes).toBe(0);
    expect(store.isEmpty).toBe(true);
  });

  it("exposes entries and total bytes after add", () => {
    const store = new FileBasketStore();
    store.add(entry("a", "a.txt", 4));
    store.add(entry("b", "b.txt", 6));
    expect(store.entries).toHaveLength(2);
    expect(store.totalBytes).toBe(10);
    expect(store.isEmpty).toBe(false);
  });

  it("removes entries by id", () => {
    const store = new FileBasketStore();
    store.add(entry("a", "a.txt", 4));
    store.remove("a");
    expect(store.entries).toEqual([]);
  });

  it("surfaces the cap-exceeded error message instead of throwing", () => {
    const store = new FileBasketStore();
    const cap = 100 * 1024 * 1024;
    store.add(entry("big", "big.bin", cap));
    store.add(entry("one", "one.bin", 1));
    expect(store.error).toMatch(/104857600|File basket exceeds/);
    expect(store.entries).toHaveLength(1);
  });

  it("reactivity — observers fire when entries change", () => {
    const store = new FileBasketStore();
    const snapshots: number[] = [];
    const dispose = autorun(() => snapshots.push(store.totalBytes));
    store.add(entry("a", "a.txt", 4));
    store.add(entry("b", "b.txt", 6));
    store.remove("a");
    dispose();
    expect(snapshots).toEqual([0, 4, 10, 6]);
  });
});
