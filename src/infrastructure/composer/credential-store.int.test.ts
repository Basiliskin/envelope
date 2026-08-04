import { describe, expect, it } from "vitest";
import { autorun } from "mobx";
import { CredentialStore } from "./credential-store.js";

const strongPassword = "correct horse battery staple extra";

describe("CredentialStore", () => {
  it("starts with empty password, no dial positions, dial unlocked", () => {
    const store = new CredentialStore();
    expect(store.password).toBe("");
    expect(store.firstPosition).toBeNull();
    expect(store.secondPosition).toBeNull();
    expect(store.thirdPosition).toBeNull();
    expect(store.dialLocked).toBe(false);
  });

  it("flags credential issues as soon as positions are set", () => {
    const store = new CredentialStore();
    store.setPassword(strongPassword);
    store.setDialPosition(1, 50);
    store.setDialPosition(2, 50);
    store.setDialPosition(3, 50);
    const codes = store.credentialIssues.map((issue) => issue.code);
    expect(codes).toContain("dial-all-equal");
  });

  it("computes combined entropy bits without the dial when locked off", () => {
    const store = new CredentialStore();
    store.setPassword("aZ09!");
    const pool = 26 + 26 + 10 + 33;
    const expected = 5 * Math.log2(pool);
    expect(store.combinedBits).toBeCloseTo(expected, 5);
  });

  it("adds the 19.93 dial bits when locked", () => {
    const store = new CredentialStore();
    store.setPassword(strongPassword);
    store.setDialPosition(1, 37);
    store.setDialPosition(2, 12);
    store.setDialPosition(3, 88);
    store.lockDial();
    expect(store.combinedBits - 19.93).toBeGreaterThan(40);
  });

  it("hasAllDialPositions only true when all three are set", () => {
    const store = new CredentialStore();
    expect(store.hasAllDialPositions).toBe(false);
    store.setDialPosition(1, 37);
    store.setDialPosition(2, 12);
    expect(store.hasAllDialPositions).toBe(false);
    store.setDialPosition(3, 88);
    expect(store.hasAllDialPositions).toBe(true);
  });

  it("reset clears all credential state", () => {
    const store = new CredentialStore();
    store.setPassword(strongPassword);
    store.setDialPosition(1, 37);
    store.lockDial();
    store.reset();
    expect(store.password).toBe("");
    expect(store.firstPosition).toBeNull();
    expect(store.dialLocked).toBe(false);
  });

  it("reactivity — combinedBits observers fire when password changes", () => {
    const store = new CredentialStore();
    const values: number[] = [];
    const dispose = autorun(() => values.push(store.combinedBits));
    store.setPassword("a");
    store.setPassword("ab");
    store.setPassword("abc");
    dispose();
    expect(values.length).toBeGreaterThanOrEqual(3);
  });
});
