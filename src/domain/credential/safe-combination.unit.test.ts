import { describe, expect, it } from "vitest";
import {
  InvalidSafeCombinationError,
  SafeCombination,
} from "./safe-combination.js";

describe("SafeCombination", () => {
  it("serializes three alternating rounds canonically", () => {
    expect(SafeCombination.create([37, 12, 88]).canonical()).toBe(
      "R1:CW:37|R2:CCW:12|R3:CW:88",
    );
    expect(SafeCombination.create([37, 12, 88]).toValue()).toEqual([
      37, 12, 88,
    ]);
  });

  it.each([
    [50, 50, 50],
    [10, 20, 30],
    [90, 60, 30],
    [0, 19, 83],
    [10, 25, 70],
    [7, 4, 26],
  ] as const)("rejects weak combination %j", (...positions) => {
    expect(() => SafeCombination.create(positions)).toThrow(
      InvalidSafeCombinationError,
    );
  });

  it.each([
    [-1, 12, 88],
    [100, 12, 88],
    [37.5, 12, 88],
  ] as const)("rejects out-of-range combination %j", (...positions) => {
    expect(() => SafeCombination.create(positions)).toThrow(
      InvalidSafeCombinationError,
    );
  });
});
