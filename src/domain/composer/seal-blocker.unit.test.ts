import { describe, expect, it } from "vitest";
import { FileBasket } from "./file-basket.js";
import { analyzeSealBlockers, MIN_COMBINED_ENTROPY_BITS } from "./seal-blocker.js";

const basket = (): FileBasket =>
  FileBasket.empty().withEntry({
    id: "a",
    path: "a.txt",
    size: 4,
    content: new Uint8Array([1, 2, 3, 4]),
  });

const strongPassword = "correct horse battery staple extra";
const strongPositions: readonly [number, number, number] = [37, 12, 88];

describe("analyzeSealBlockers", () => {
  it("returns no blockers when all gates pass", () => {
    const blockers = analyzeSealBlockers({
      basket: basket(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: {
        memoryKiB: 512 * 1024,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(blockers).toEqual([]);
  });

  it("flags an empty file basket", () => {
    const blockers = analyzeSealBlockers({
      basket: FileBasket.empty(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: {
        memoryKiB: 512 * 1024,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(blockers.map((b) => b.code)).toContain("basket-empty");
  });

  it("flags an empty password", () => {
    const blockers = analyzeSealBlockers({
      basket: basket(),
      password: "",
      positions: strongPositions,
      dialLocked: true,
      argon2: {
        memoryKiB: 512 * 1024,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(blockers.map((b) => b.code)).toContain("credential-invalid");
  });

  it("flags a weak dial combination", () => {
    const blockers = analyzeSealBlockers({
      basket: basket(),
      password: strongPassword,
      positions: [50, 50, 50],
      dialLocked: true,
      argon2: {
        memoryKiB: 512 * 1024,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(blockers.map((b) => b.code)).toContain("credential-invalid");
  });

  it("flags argon2 outside the frozen range", () => {
    const blockers = analyzeSealBlockers({
      basket: basket(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: {
        memoryKiB: 1024 * 1024 + 1,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(blockers.map((b) => b.code)).toContain("argon2-out-of-range");
  });

  it("flags argon2 not yet calibrated (null)", () => {
    const blockers = analyzeSealBlockers({
      basket: basket(),
      password: strongPassword,
      positions: strongPositions,
      dialLocked: true,
      argon2: null,
    });
    expect(blockers.map((b) => b.code)).toContain("argon2-out-of-range");
  });

  it("flags a short password even with the dial locked below the 80-bit threshold", () => {
    const blockers = analyzeSealBlockers({
      basket: basket(),
      password: "hunter2",
      positions: strongPositions,
      dialLocked: true,
      argon2: {
        memoryKiB: 512 * 1024,
        iterations: 3,
        parallelism: 1,
      },
    });
    expect(blockers.map((b) => b.code)).toContain(
      "combined-entropy-below-threshold",
    );
    const blocker = blockers.find(
      (entry) => entry.code === "combined-entropy-below-threshold",
    );
    expect(blocker?.entropyBits).toBeDefined();
    expect(blocker?.entropyBits ?? 0).toBeLessThan(MIN_COMBINED_ENTROPY_BITS);
  });
});
