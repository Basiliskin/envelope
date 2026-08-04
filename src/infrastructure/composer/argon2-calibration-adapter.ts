import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";
import type {
  Argon2CalibrationPort,
  Argon2CalibrationResult,
} from "../../application/composer/composer-ports.js";
import type { WasmCapabilitiesPort } from "../../application/composer/composer-ports.js";
import { calibrateArgon2 } from "./composer-seal-driver.js";
import { Argon2Params } from "../../domain/credential/argon2-params.js";

export class Argon2CalibrationAdapter implements Argon2CalibrationPort {
  constructor(private readonly wasm: WasmCapabilitiesPort) {}

  async calibrate(_maxMemoryKiB: number): Promise<Argon2CalibrationResult> {
    const startedAt = performance.now();
    const selection = await calibrateArgon2(
      (size) =>
        this.wasm.probe(size).then((result) => result.canAllocate),
      (measured) => pickPreset(measured),
    );
    const wallClockMs = performance.now() - startedAt;
    const params = Argon2Params.create({
      memoryKiB: selection.memoryKiB,
      iterations: selection.iterations,
      parallelism: 1,
    });
    return { params: params.toValue(), wallClockMs };
  }
}

function pickPreset(
  measured: number,
): Pick<Argon2ParamsValue, "memoryKiB" | "iterations"> {
  if (measured >= 1024 * 1024) {
    return { memoryKiB: 1024 * 1024, iterations: 4 };
  }
  if (measured >= 512 * 1024) {
    return { memoryKiB: 512 * 1024, iterations: 3 };
  }
  return { memoryKiB: 256 * 1024, iterations: 3 };
}

export class StaticArgon2Calibration implements Argon2CalibrationPort {
  constructor(private readonly preset: Argon2ParamsValue) {}

  calibrate(): Promise<Argon2CalibrationResult> {
    return Promise.resolve({
      params: { ...this.preset },
      wallClockMs: 0,
    });
  }
}
