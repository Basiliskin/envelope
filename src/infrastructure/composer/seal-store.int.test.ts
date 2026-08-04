import { describe, expect, it } from "vitest";
import { autorun, reaction } from "mobx";
import { ComposerSealDriver } from "./composer-seal-driver.js";
import { CredentialStore } from "./credential-store.js";
import { FileBasketStore } from "./file-basket-store.js";
import { SealStore } from "./seal-store.js";
import type { PackagingPort } from "../../application/ports/packaging-ports.js";

const strongPassword = "correct horse battery staple extra";
const [R1, R2, R3] = [37, 12, 88] as const;

class FakePackaging implements PackagingPort {
  emitted: readonly Uint8Array[] = [];

  emit(payloadBytes: Uint8Array): Promise<string> {
    this.emitted = [...this.emitted, payloadBytes];
    return Promise.resolve(
      `<html data-payload-bytes="${String(payloadBytes.byteLength)}"></html>`,
    );
  }
}

function armedStores(): {
  credential: CredentialStore;
  basket: FileBasketStore;
  driver: ComposerSealDriver;
  packaging: FakePackaging;
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
    packaging: new FakePackaging(),
  };
}

describe("SealStore", () => {
  it("starts in the idle phase", () => {
    const seal = new SealStore(
      new CredentialStore(),
      new FileBasketStore(),
      new ComposerSealDriver(),
      new FakePackaging(),
    );
    expect(seal.phase).toBe("idle");
    expect(seal.canStartSeal).toBe(true);
    expect(seal.isSealing).toBe(false);
    expect(seal.resultDocument).toBeNull();
    expect(seal.resultDownloadUrl).toBeNull();
  });

  it("ensureSealReady gates on blockers", () => {
    const seal = new SealStore(
      new CredentialStore(),
      new FileBasketStore(),
      new ComposerSealDriver(),
      new FakePackaging(),
    );
    const result = seal.ensureSealReady();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/password|file/i);
    }
  });

  it("ensureSealReady passes when the gates are open", () => {
    const { credential, basket, driver, packaging } = armedStores();
    const seal = new SealStore(credential, basket, driver, packaging);
    const result = seal.ensureSealReady();
    expect(result.ok).toBe(true);
  });

  it("start transitions through every sealing phase and resolves to done", async () => {
    const { credential, basket, driver, packaging } = armedStores();
    const seal = new SealStore(credential, basket, driver, packaging);

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

  it("packages the sealed bytes through the injected PackagingPort", async () => {
    const { credential, basket, driver, packaging } = armedStores();
    const seal = new SealStore(credential, basket, driver, packaging);
    await seal.start();

    expect(packaging.emitted).toHaveLength(1);
    expect(packaging.emitted[0]).toBe(seal.resultBytes);
    expect(seal.resultDocument).toContain("<html");
    expect(seal.resultDownloadUrl).toMatch(/^blob:/);
  });

  it("start records the first blocker message when the gates are not open", async () => {
    const seal = new SealStore(
      new CredentialStore(),
      new FileBasketStore(),
      new ComposerSealDriver(),
      new FakePackaging(),
    );
    await seal.start();
    expect(seal.phase).toBe("error");
    expect(seal.lastError).toMatch(/password|file/i);
  });

  it("reset returns the store to idle and clears the packaged result", async () => {
    const { credential, basket, driver, packaging } = armedStores();
    const seal = new SealStore(credential, basket, driver, packaging);
    await seal.start();
    seal.reset();
    expect(seal.phase).toBe("idle");
    expect(seal.resultBytes).toBeNull();
    expect(seal.resultDocument).toBeNull();
    expect(seal.resultDownloadUrl).toBeNull();
    expect(seal.progress).toBeNull();
  });

  it("reactivity — progress observers see end-of-seal progress", async () => {
    const { credential, basket, driver, packaging } = armedStores();
    const seal = new SealStore(credential, basket, driver, packaging);
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
