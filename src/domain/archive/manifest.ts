export class InvalidManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidManifestError";
  }
}

export const MANIFEST_ENTRY_NAME = "manifest.json";
const MANIFEST_VERSION = 1 as const;
const SHA256_SIZE = 32;

export interface ManifestEntry {
  readonly path: string;
  readonly size: number;
  readonly sha256: Uint8Array;
  readonly mode: number;
}

export interface Manifest {
  readonly version: typeof MANIFEST_VERSION;
  readonly createdAt: string;
  readonly entries: readonly ManifestEntry[];
}

export function createManifestEntry(input: {
  readonly path: string;
  readonly size: number;
  readonly sha256: Uint8Array;
  readonly mode?: number;
}): ManifestEntry {
  if (!Number.isInteger(input.size) || input.size < 0) {
    throw new InvalidManifestError("Manifest entry size must be a non-negative integer.");
  }
  if (!(input.sha256 instanceof Uint8Array) || input.sha256.byteLength !== SHA256_SIZE) {
    throw new InvalidManifestError(
      `Manifest entry sha256 must be a ${String(SHA256_SIZE)}-byte Uint8Array.`,
    );
  }
  const mode = input.mode ?? 0o100644;
  if (!Number.isInteger(mode) || mode < 0 || mode > 0o177777) {
    throw new InvalidManifestError("Manifest entry mode must be a valid unix mode.");
  }
  return {
    path: input.path,
    size: input.size,
    sha256: input.sha256,
    mode,
  };
}

export function createManifest(input: {
  readonly createdAt?: string;
  readonly entries: readonly ManifestEntry[];
}): Manifest {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const sorted = [...input.entries].sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });
  return { version: MANIFEST_VERSION, createdAt, entries: sorted };
}

export function serializeManifest(manifest: Manifest): Uint8Array {
  const ordered = manifest.entries.map((entry) => ({
    path: entry.path,
    size: entry.size,
    sha256: bytesToHex(entry.sha256),
    mode: entry.mode,
  }));
  const orderedRoot = {
    version: manifest.version,
    createdAt: manifest.createdAt,
    entries: ordered,
  };
  return new TextEncoder().encode(JSON.stringify(orderedRoot));
}

export function parseManifest(bytes: Uint8Array): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InvalidManifestError("Manifest JSON could not be parsed.");
  }
  if (!isObject(raw)) {
    throw new InvalidManifestError("Manifest must be a JSON object.");
  }
  if (raw.version !== MANIFEST_VERSION) {
    throw new InvalidManifestError(
      `Manifest version must be ${String(MANIFEST_VERSION)}.`,
    );
  }
  if (typeof raw.createdAt !== "string") {
    throw new InvalidManifestError("Manifest createdAt must be a string.");
  }
  if (!Array.isArray(raw.entries)) {
    throw new InvalidManifestError("Manifest entries must be an array.");
  }
  const entries: ManifestEntry[] = [];
  for (const [index, value] of raw.entries.entries()) {
    if (!isObject(value)) {
      throw new InvalidManifestError(
        `Manifest entry ${String(index)} must be an object.`,
      );
    }
    const { path, size, sha256, mode } = value;
    if (typeof path !== "string" || path.length === 0) {
      throw new InvalidManifestError(
        `Manifest entry ${String(index)} path must be a non-empty string.`,
      );
    }
    if (!Number.isInteger(size) || (size as number) < 0) {
      throw new InvalidManifestError(
        `Manifest entry ${String(index)} size must be a non-negative integer.`,
      );
    }
    if (typeof sha256 !== "string" || sha256.length !== SHA256_SIZE * 2) {
      throw new InvalidManifestError(
        `Manifest entry ${String(index)} sha256 must be a ${String(SHA256_SIZE)}-byte hex string.`,
      );
    }
    const modeValue: number = typeof mode === "number" ? mode : 0o100644;
    if (!Number.isInteger(modeValue) || modeValue < 0 || modeValue > 0o177777) {
      throw new InvalidManifestError(
        `Manifest entry ${String(index)} mode must be a valid unix mode.`,
      );
    }
    entries.push(
      createManifestEntry({
        path,
        size: size as number,
        sha256: hexToBytes(sha256),
        mode: modeValue,
      }),
    );
  }
  return createManifest({ createdAt: raw.createdAt, entries });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const HEX = "0123456789abcdef";

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += HEX[(byte >>> 4) & 0x0f] ?? "";
    out += HEX[byte & 0x0f] ?? "";
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new InvalidManifestError("Hex string must have even length.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    const hi = HEX.indexOf(hex.charAt(i * 2).toLowerCase());
    const lo = HEX.indexOf(hex.charAt(i * 2 + 1).toLowerCase());
    if (hi < 0 || lo < 0) {
      throw new InvalidManifestError("Hex string contains invalid characters.");
    }
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
}
