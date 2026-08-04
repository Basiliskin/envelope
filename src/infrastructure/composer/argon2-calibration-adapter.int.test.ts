import { describe, expect, it } from "vitest";
import {
  Argon2CalibrationAdapter,
  StaticArgon2Calibration,
} from "./argon2-calibration-adapter.js";
import { InMemoryWasmProbe } from "./wasm-capabilities-adapter.js";

describe("Argon2CalibrationAdapter", () => {
  it("returns the smallest preset when even 256 MiB is refused", async () => {
    const probe = new InMemoryWasmProbe(() => false);
    const adapter = new Argon2CalibrationAdapter(probe);
    await expect(adapter.calibrate(1024 * 1024)).rejects.toThrow(
      /every Argon2 memory preset/,
    );
  });

  it("selects the highest preset the probe accepts", async () => {
    const probe = new InMemoryWasmProbe((bytes) => bytes <= 512 * 1024 * 1024);
    const adapter = new Argon2CalibrationAdapter(probe);
    const result = await adapter.calibrate(1024 * 1024);
    expect(result.params.memoryKiB).toBe(512 * 1024);
    expect(result.params.iterations).toBe(3);
  });

  it("records wall clock time", async () => {
    const probe = new InMemoryWasmProbe(() => true);
    const adapter = new Argon2CalibrationAdapter(probe);
    const result = await adapter.calibrate(1024 * 1024);
    expect(result.wallClockMs).toBeGreaterThanOrEqual(0);
  });
});

describe("StaticArgon2Calibration", () => {
  it("returns the supplied preset verbatim", async () => {
    const adapter = new StaticArgon2Calibration({
      memoryKiB: 256 * 1024,
      iterations: 3,
      parallelism: 1,
    });
    const result = await adapter.calibrate();
    expect(result.params).toEqual({
      memoryKiB: 256 * 1024,
      iterations: 3,
      parallelism: 1,
    });
  });
});
