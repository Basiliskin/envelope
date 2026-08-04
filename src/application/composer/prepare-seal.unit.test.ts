import { describe, expect, it } from "vitest";
import { FileBasket } from "../../domain/composer/file-basket.js";
import { prepareSeal } from "./prepare-seal.js";

const basket = (): FileBasket =>
  FileBasket.empty().withEntry({
    id: "a",
    path: "hello.txt",
    size: 2,
    content: new Uint8Array([0x68, 0x69]),
  });

const strongPassword = "correct horse battery staple extra";
const strongPositions: readonly [number, number, number] = [37, 12, 88];

const defaultArgon2 = {
  memoryKiB: 512 * 1024,
  iterations: 3,
  parallelism: 1,
} as const;

describe("prepareSeal", () => {
  it("returns ready when all gates pass", () => {
    const result = prepareSeal({
      basket: basket(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: defaultArgon2,
      salt: new Uint8Array(16),
      noncePrefix: new Uint8Array(4),
      chunkSize: 1024 * 1024,
    });
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.input.entries).toHaveLength(1);
      expect(result.input.entries[0]?.path).toBe("hello.txt");
      expect(result.input.argon2).toEqual(defaultArgon2);
    }
  });

  it("returns blocked when the basket is empty", () => {
    const result = prepareSeal({
      basket: FileBasket.empty(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: defaultArgon2,
      salt: new Uint8Array(16),
      noncePrefix: new Uint8Array(4),
      chunkSize: 1024 * 1024,
    });
    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.blockers.map((b) => b.code)).toContain("basket-empty");
    }
  });

  it("returns blocked when the credential has issues", () => {
    const result = prepareSeal({
      basket: basket(),
      password: "",
      positions: strongPositions,
      dialLocked: true,
      argon2: defaultArgon2,
      salt: new Uint8Array(16),
      noncePrefix: new Uint8Array(4),
      chunkSize: 1024 * 1024,
    });
    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.blockers.map((b) => b.code)).toContain(
        "credential-invalid",
      );
    }
  });

  it("returns blocked when the argon2 params are null", () => {
    const result = prepareSeal({
      basket: basket(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: null,
      salt: new Uint8Array(16),
      noncePrefix: new Uint8Array(4),
      chunkSize: 1024 * 1024,
    });
    expect(result.kind).toBe("blocked");
  });

  it("does not advance when entropy is below the 80-bit threshold", () => {
    const result = prepareSeal({
      basket: basket(),
      password: "hunter2",
      positions: strongPositions,
      dialLocked: true,
      argon2: defaultArgon2,
      salt: new Uint8Array(16),
      noncePrefix: new Uint8Array(4),
      chunkSize: 1024 * 1024,
    });
    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.blockers.map((b) => b.code)).toContain(
        "combined-entropy-below-threshold",
      );
    }
  });
});
