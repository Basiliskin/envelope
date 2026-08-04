// M8 test matrix: payload sizes and failure modes, driven through the real
// composer seal driver and the real reader unseal pipeline (Argon2 MIN
// preset, real AES-GCM STREAM, real fflate zip) — not mocks. Cross-browser
// and file:// / https:// coverage lives in the Playwright suite instead;
// this file exercises the crypto/archive pipeline end to end in Node.
import { describe, expect, it } from "vitest";
import {
  FileBasket,
  FileBasketCapExceededError,
} from "./domain/composer/file-basket.js";
import { ComposerSealDriver } from "./infrastructure/composer/composer-seal-driver.js";
import { UnsealPackage } from "./application/reader/unseal-package.js";
import { BrowserReaderCrypto } from "./infrastructure/reader/browser-reader-crypto.js";
import { FflateReaderArchive } from "./infrastructure/archive/fflate-adapter.js";
import type { MemoryPreflightPort } from "./application/reader/reader-ports.js";
import { InvalidSealedPackageError } from "./domain/reader/sealed-package.js";

const PASSWORD = "correct horse battery staple extra";
const POSITIONS: readonly [number, number, number] = [37, 12, 88];
const ARGON2_MIN = {
  memoryKiB: 256 * 1024,
  iterations: 3,
  parallelism: 1,
} as const;

const alwaysAllow: MemoryPreflightPort = {
  canAllocate: () => Promise.resolve(true),
};

function basketOf(sizeBytes: number, path = "payload.bin"): FileBasket {
  const content = new Uint8Array(sizeBytes);
  for (let i = 0; i < content.length; i += 1) content[i] = i % 256;
  return FileBasket.empty().withEntry({
    id: path,
    path,
    size: sizeBytes,
    content,
  });
}

async function seal(basket: FileBasket): Promise<Uint8Array> {
  return new ComposerSealDriver().seal({
    basket,
    password: PASSWORD,
    positions: POSITIONS,
    dialLocked: true,
    argon2: ARGON2_MIN,
    salt: crypto.getRandomValues(new Uint8Array(16)),
    noncePrefix: crypto.getRandomValues(new Uint8Array(4)),
    chunkSize: 1024 * 1024,
  });
}

function unsealer(memory: MemoryPreflightPort = alwaysAllow): UnsealPackage {
  return new UnsealPackage(
    memory,
    new BrowserReaderCrypto(),
    new FflateReaderArchive(),
  );
}

async function unseal(
  packageBytes: Uint8Array,
  credential: {
    password: string;
    combination: readonly [number, number, number];
  } = {
    password: PASSWORD,
    combination: POSITIONS,
  },
) {
  return unsealer().execute({
    packageBytes,
    credential,
    signal: new AbortController().signal,
    onProgress: () => undefined,
  });
}

describe("M8 payload-size matrix", () => {
  it.each([
    ["1 KB", 1024],
    ["10 MB", 10 * 1024 * 1024],
  ])(
    "round-trips a %s payload",
    async (_label, size) => {
      const packageBytes = await seal(basketOf(size));
      const files = await unseal(packageBytes);
      expect(files).toHaveLength(1);
      expect(files[0]?.bytes.byteLength).toBe(size);
      expect(files[0]?.bytes[size - 1]).toBe((size - 1) % 256);
    },
    60_000,
  );

  it("round-trips a 100 MB payload", async () => {
    const size = 100 * 1024 * 1024;
    const packageBytes = await seal(basketOf(size));
    const files = await unseal(packageBytes);
    expect(files).toHaveLength(1);
    expect(files[0]?.bytes.byteLength).toBe(size);
  }, 180_000);

  it("rejects a single file over the 100 MiB basket cap before sealing ever runs", () => {
    expect(() => basketOf(100 * 1024 * 1024 + 1)).toThrow(
      FileBasketCapExceededError,
    );
  });
});

describe("M8 failure-mode matrix", () => {
  it("rejects the wrong password with a generic error", async () => {
    const packageBytes = await seal(basketOf(1024));
    await expect(
      unseal(packageBytes, {
        password: "wrong password entirely",
        combination: POSITIONS,
      }),
    ).rejects.toThrow();
  }, 30_000);

  it("rejects the wrong dial combination with a generic error", async () => {
    const packageBytes = await seal(basketOf(1024));
    await expect(
      unseal(packageBytes, { password: PASSWORD, combination: [1, 2, 3] }),
    ).rejects.toThrow();
  }, 30_000);

  it("produces the same generic failure for wrong password and wrong dial", async () => {
    const packageBytes = await seal(basketOf(1024));
    const wrongPassword = await unseal(packageBytes, {
      password: "wrong password entirely",
      combination: POSITIONS,
    }).catch((error: unknown) => error);
    const wrongDial = await unseal(packageBytes, {
      password: PASSWORD,
      combination: [1, 2, 3],
    }).catch((error: unknown) => error);
    expect(wrongPassword).toBeInstanceOf(Error);
    expect(wrongDial).toBeInstanceOf(Error);
    expect((wrongPassword as Error).message).toBe((wrongDial as Error).message);
  }, 30_000);

  it("rejects a corrupted ciphertext byte", async () => {
    const packageBytes = await seal(basketOf(4096));
    const tampered = packageBytes.slice();
    const lastByte = tampered.length - 1;
    tampered[lastByte] = (tampered[lastByte] ?? 0) ^ 0xff;
    await expect(unseal(tampered)).rejects.toThrow();
  }, 30_000);

  it("rejects a truncated file", async () => {
    const packageBytes = await seal(basketOf(4096));
    const truncated = packageBytes.slice(0, packageBytes.length - 10);
    await expect(unseal(truncated)).rejects.toThrow(InvalidSealedPackageError);
  }, 30_000);

  it("rejects a header field pushed out of the SPK1 valid range", async () => {
    const packageBytes = await seal(basketOf(1024));
    const tampered = packageBytes.slice();
    // Bytes 6-9 hold the Argon2 memoryKiB field (u32 BE) — forcing it to
    // 0xffffffff pushes it outside [MIN, MAX] and must be rejected
    // structurally, before any AEAD verification happens.
    tampered[6] = 0xff;
    tampered[7] = 0xff;
    tampered[8] = 0xff;
    tampered[9] = 0xff;
    await expect(unseal(tampered)).rejects.toThrow(InvalidSealedPackageError);
  }, 30_000);
});
