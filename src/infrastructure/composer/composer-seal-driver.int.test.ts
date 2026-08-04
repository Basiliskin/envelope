import { describe, expect, it } from "vitest";
import { ComposerSealDriver, calibrateArgon2 } from "./composer-seal-driver.js";
import { FileBasket } from "../../domain/composer/file-basket.js";

const strongPassword = "correct horse battery staple extra";
const strongPositions: readonly [number, number, number] = [37, 12, 88];

const defaultArgon2 = {
  memoryKiB: 256 * 1024,
  iterations: 3,
  parallelism: 1,
} as const;

describe("ComposerSealDriver", () => {
  it("produces a non-empty sealed package from a one-entry basket", async () => {
    const basket = FileBasket.empty().withEntry({
      id: "hello",
      path: "hello.txt",
      size: 11,
      content: new Uint8Array([
        0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
      ]),
    });
    const bytes = await new ComposerSealDriver().seal({
      basket,
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: defaultArgon2,
      salt: new Uint8Array(16),
      noncePrefix: new Uint8Array(4),
      chunkSize: 1024 * 1024,
    });
    expect(bytes.byteLength).toBeGreaterThan(0);
    // First 4 bytes are the SPK1 magic.
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("SPK1");
  });

  it("throws when the credential gates are not all satisfied", async () => {
    const basket = FileBasket.empty().withEntry({
      id: "hello",
      path: "hello.txt",
      size: 5,
      content: new Uint8Array([0x68, 0x69, 0x21, 0x0a, 0x00]),
    });
    await expect(
      new ComposerSealDriver().seal({
        basket,
        password: "hunter2",
        positions: strongPositions,
        dialLocked: true,
        argon2: defaultArgon2,
        salt: new Uint8Array(16),
        noncePrefix: new Uint8Array(4),
        chunkSize: 1024 * 1024,
      }),
    ).rejects.toThrow(/entropy/i);
  });
});

describe("calibrateArgon2", () => {
  it("returns the largest preset the probe accepts", async () => {
    const memory = await calibrateArgon2(
      (size) => Promise.resolve(size <= 512 * 1024),
      (measured) => ({ memoryKiB: measured, iterations: 3 }),
    );
    expect(memory.memoryKiB).toBe(512 * 1024);
  });

  it("throws when no preset is accepted", async () => {
    await expect(
      calibrateArgon2(
        () => Promise.resolve(false),
        () => ({ memoryKiB: 256 * 1024, iterations: 3 }),
      ),
    ).rejects.toThrow(/every Argon2 memory preset/);
  });
});
