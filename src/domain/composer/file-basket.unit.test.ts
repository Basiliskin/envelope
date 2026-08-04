import { describe, expect, it } from "vitest";
import { FileBasket, FileBasketCapExceededError } from "./file-basket.js";

describe("FileBasket", () => {
  it("starts empty", () => {
    const basket = FileBasket.empty();
    expect(basket.isEmpty()).toBe(true);
    expect(basket.totalBytes()).toBe(0);
    expect(basket.snapshot()).toEqual([]);
  });

  it("accumulates entries and total size", () => {
    const basket = FileBasket.empty()
      .withEntry({
        id: "a",
        path: "a.txt",
        size: 10,
        content: new Uint8Array(10),
      })
      .withEntry({
        id: "b",
        path: "b.txt",
        size: 5,
        content: new Uint8Array(5),
      });
    expect(basket.isEmpty()).toBe(false);
    expect(basket.totalBytes()).toBe(15);
    expect(basket.snapshot().map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("removes entries by id", () => {
    const basket = FileBasket.empty().withEntry({
      id: "a",
      path: "a.txt",
      size: 10,
      content: new Uint8Array(10),
    });
    expect(basket.withoutEntry("a").isEmpty()).toBe(true);
  });

  it("rejects the addition that would exceed the 100 MiB cap", () => {
    const cap = 100 * 1024 * 1024;
    const basket = FileBasket.empty().withEntry({
      id: "huge",
      path: "huge.bin",
      size: cap,
      content: new Uint8Array(0),
    });
    expect(() =>
      basket.withEntry({
        id: "one-more-byte",
        path: "one.bin",
        size: 1,
        content: new Uint8Array(1),
      }),
    ).toThrow(FileBasketCapExceededError);
  });

  it("is immutable — add and remove return new baskets", () => {
    const empty = FileBasket.empty();
    const one = empty.withEntry({
      id: "a",
      path: "a.txt",
      size: 1,
      content: new Uint8Array(1),
    });
    expect(empty.isEmpty()).toBe(true);
    expect(one.isEmpty()).toBe(false);
  });
});
