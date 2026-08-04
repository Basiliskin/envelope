import { describe, expect, it } from "vitest";
import { Argon2Params, InvalidArgon2ParamsError } from "./argon2-params.js";

describe("Argon2Params", () => {
  it("exposes the frozen floor, default, and ceiling presets", () => {
    expect(Argon2Params.MIN.toValue()).toEqual({
      memoryKiB: 262144,
      iterations: 3,
      parallelism: 1,
    });
    expect(Argon2Params.DEFAULT.toValue()).toEqual({
      memoryKiB: 524288,
      iterations: 3,
      parallelism: 1,
    });
    expect(Argon2Params.MAX.toValue()).toEqual({
      memoryKiB: 1048576,
      iterations: 4,
      parallelism: 1,
    });
  });

  it("accepts parameters inside the frozen bounds", () => {
    expect(
      Argon2Params.create({
        memoryKiB: 786432,
        iterations: 4,
        parallelism: 1,
      }).toValue(),
    ).toEqual({
      memoryKiB: 786432,
      iterations: 4,
      parallelism: 1,
    });
  });

  it.each([
    { memoryKiB: 262143, iterations: 3, parallelism: 1 as const },
    { memoryKiB: 1048577, iterations: 3, parallelism: 1 as const },
    { memoryKiB: 262144.5, iterations: 3, parallelism: 1 as const },
    { memoryKiB: 262144, iterations: 2, parallelism: 1 as const },
    { memoryKiB: 262144, iterations: 5, parallelism: 1 as const },
  ])("rejects invalid parameters: $memoryKiB KiB, t=$iterations", (value) => {
    expect(() => Argon2Params.create(value)).toThrow(InvalidArgon2ParamsError);
  });
});
