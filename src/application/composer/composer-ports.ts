import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";

export interface WasmCapabilitiesResult {
  readonly canAllocate: boolean;
  readonly maxMemoryKiB: number;
  readonly errorMessage?: string;
}

export interface WasmCapabilitiesPort {
  probe(maxMemoryKiB: number): Promise<WasmCapabilitiesResult>;
}

export interface Argon2CalibrationResult {
  readonly params: Argon2ParamsValue;
  readonly wallClockMs: number;
}

export interface Argon2CalibrationPort {
  calibrate(maxMemoryKiB: number): Promise<Argon2CalibrationResult>;
}

export interface BundleEmitterPort {
  emit(input: BundleEmitterInput): Promise<void>;
}

export interface BundleEmitterInput {
  readonly filename: string;
  readonly bytes: Uint8Array;
}
