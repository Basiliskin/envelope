import { describe, expect, it } from "vitest";
import { autorun, reaction } from "mobx";
import { ComposerSealDriver } from "./composer-seal-driver.js";
import { CredentialStore } from "./credential-store.js";
import { FileBasketStore } from "./file-basket-store.js";
import { SealStore } from "./seal-store.js";

const strongPassword = "correct horse battery staple extra";
const [R1, R2, R3] = [37, 12, 88] as const;

function armedStores(): {
  credential: CredentialStore;
  basket: FileBasketStore;
  driver: ComposerSealDriver;
} {
  const credential = new CredentialStore();
  credential.setPassword(strongPassword);
  credential.setDialPosition(1, R1);
  credential.setDialPosition(2, R2);
  credential.setDialPosition(3, R3);
  credential.lockDial();
  const basket = new FileBasketStore();
  basket.add({
    id: "hello",
    path: "hello.txt",
    size: 5,
    content: new Uint8Array([0x68, 0x69, 0x21, 0x0a, 0x00]),
  });
  return {
    credential,
    basket,
    driver: new ComposerSealDriver(),
  };
}

describe("SealStore", () => {
  it("starts in the idle phase", () => {
    const seal = new SealStore(
      new CredentialStore(),
      new FileBasketStore(),
      new ComposerSealDriver(),
    );
    expect(seal.phase).toBe("idle");
    expect(seal.canStartSeal).toBe(true);
    expect(seal.isSealing).toBe(false);
  });

  it("ensureSealReady gates on blockers", () => {
    const seal = new SealStore(
      new CredentialStore(),
      new FileBasketStore(),
      new ComposerSealDriver(),
    );
    const result = seal.ensureSealReady();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/password|file/i);
    }
  });

  it("ensureSealReady passes when the gates are open", () => {
    const { credential, basket, driver } = armedStores();
    const seal = new SealStore(credential, basket, driver);
    const result = seal.ensureSealReady();
    expect(result.ok).toBe(true);
  });

  it("start transitions through every sealing phase and resolves to done", async () => {
    const { credential, basket, driver } = armedStores();
    const seal = new SealStore(credential, basket, driver);

    const phases: string[] = [];
    const dispose = autorun(() => phases.push(seal.phase));
    await seal.start();
    dispose();

    expect(seal.phase).toBe("done");
    expect(seal.resultBytes).toBeInstanceOf(Uint8Array);
    expect(phases.at(0)).toBe("idle");
    expect(phases.at(-1)).toBe("done");
    expect(phases).toContain("hashing");
    expect(phases).toContain("zipping");
    expect(phases).toContain("encrypting");
    expect(phases).toContain("emitting");
  });

  it("start records the first blocker message when the gates are not open", async () => {
    const seal = new SealStore(
      new CredentialStore(),
      new FileBasketStore(),
      new ComposerSealDriver(),
    );
    await seal.start();
    expect(seal.phase).toBe("error");
    expect(seal.lastError).toMatch(/password|file/i);
  });

  it("reset returns the store to idle", async () => {
    const { credential, basket, driver } = armedStores();
    const seal = new SealStore(credential, basket, driver);
    await seal.start();
    seal.reset();
    expect(seal.phase).toBe("idle");
    expect(seal.resultBytes).toBeNull();
    expect(seal.progress).toBeNull();
  });

  it("reactivity — progress observers see end-of-seal progress", async () => {
    const { credential, basket, driver } = armedStores();
    const seal = new SealStore(credential, basket, driver);
    const samples: number[] = [];
    const dispose = reaction(
      () => seal.progress?.current ?? -1,
      (current) => samples.push(current),
    );
    await seal.start();
    dispose();
    expect(samples.at(-1)).toBe(4);
  });
});
