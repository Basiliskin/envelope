import { describe, expect, it } from "vitest";
import { exponentialBackoffMs } from "./backoff.js";

describe("exponentialBackoffMs", () => {
  it("is zero with no failed attempts", () => {
    expect(exponentialBackoffMs(0)).toBe(0);
  });

  it("doubles per consecutive failure", () => {
    expect(exponentialBackoffMs(1)).toBe(1000);
    expect(exponentialBackoffMs(2)).toBe(2000);
    expect(exponentialBackoffMs(3)).toBe(4000);
    expect(exponentialBackoffMs(4)).toBe(8000);
  });

  it("caps at 30 seconds", () => {
    expect(exponentialBackoffMs(10)).toBe(30_000);
    expect(exponentialBackoffMs(100)).toBe(30_000);
  });

  it("treats non-positive or non-integer input as zero delay", () => {
    expect(exponentialBackoffMs(-1)).toBe(0);
    expect(exponentialBackoffMs(0.5)).toBe(0);
    expect(exponentialBackoffMs(Number.NaN)).toBe(0);
  });
});
