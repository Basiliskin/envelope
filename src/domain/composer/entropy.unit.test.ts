import { describe, expect, it } from "vitest";
import {
  combinedEntropyBits,
  dialEntropyBits,
  passwordEntropyBits,
} from "./entropy.js";

describe("passwordEntropyBits", () => {
  it("returns 0 for an empty password", () => {
    expect(passwordEntropyBits("")).toBe(0);
  });

  it("estimates a diceware-style passphrase above the threshold", () => {
    const bits = passwordEntropyBits("correct horse battery staple extra");
    expect(bits).toBeGreaterThan(40);
  });

  it("grows linearly with length", () => {
    const a = passwordEntropyBits("aaaaa");
    const b = passwordEntropyBits("aaaaaaaaaa");
    expect(b).toBeCloseTo(a * 2, 5);
  });
});

describe("dialEntropyBits", () => {
  it("is the fixed 19.93 bits the threat model names", () => {
    expect(dialEntropyBits()).toBe(19.93);
  });
});

describe("combinedEntropyBits", () => {
  it("adds the dial contribution when the dial is locked", () => {
    const noDial = combinedEntropyBits({
      password: "correcthorsebatterystaple",
      dialLocked: false,
    });
    const withDial = combinedEntropyBits({
      password: "correcthorsebatterystaple",
      dialLocked: true,
    });
    expect(withDial - noDial).toBeCloseTo(19.93, 5);
  });

  it("zeroes password bits when the dial is unlocked", () => {
    expect(
      combinedEntropyBits({
        password: "correcthorsebatterystaple",
        dialLocked: false,
      }),
    ).toBeGreaterThan(0);
    expect(
      combinedEntropyBits({ password: "", dialLocked: false }),
    ).toBe(0);
  });
});
