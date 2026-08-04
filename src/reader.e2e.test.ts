import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { Argon2Params } from "./domain/credential/argon2-params.js";
import { encodeHeader } from "./infrastructure/crypto/header-codec.js";
import { mountReader } from "./reader.js";

interface GlobalWithDom {
  document: Document;
  window: Window;
}

const window = new Window();
const global = globalThis as unknown as GlobalWithDom;
global.document = window.document as unknown as Document;
global.window = window;

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function packageBytes(): Uint8Array {
  const header = encodeHeader({
    argon2: Argon2Params.MIN,
    salt: new Uint8Array(16),
    noncePrefix: new Uint8Array(4),
    chunkSize: 1024,
    chunkCount: 1,
  });
  const output = new Uint8Array(header.byteLength + 20);
  output.set(header);
  new DataView(output.buffer).setUint32(header.byteLength, 16, false);
  return output;
}

beforeEach(() => {
  window.document.body.innerHTML = "";
});

afterEach(() => {
  window.document.body.innerHTML = "";
});

describe("reader e2e", () => {
  it("preflights before showing credentials", async () => {
    const cleanup = mountReader(
      window.document.body as unknown as HTMLElement,
      packageBytes(),
    );

    await flush();
    const text = window.document.body.textContent;
    expect(text).toMatch(/Checking package requirements|Envelope Reader/);
    if (text.includes("Checking package requirements")) {
      expect(window.document.querySelector("#reader-password")).toBeNull();
    }
    cleanup();
  });

  it("shows the honest protection note and shared dial when preflight succeeds", async () => {
    const originalMemory = WebAssembly.Memory;
    WebAssembly.Memory = class {
      readonly buffer = new ArrayBuffer(Argon2Params.MIN.memoryKiB * 1024);
    } as unknown as typeof WebAssembly.Memory;
    const targetNode = window.document.createElement("div");
    const target = targetNode as unknown as HTMLElement;
    window.document.body.append(targetNode);
    const cleanup = mountReader(target, packageBytes());
    await flush();

    expect(
      window.document.querySelector('[data-testid="protection-note"]')
        ?.textContent,
    ).toContain("does not protect");
    expect(
      window.document.querySelector('[data-testid="safe-dial"]'),
    ).toBeTruthy();
    cleanup();
    WebAssembly.Memory = originalMemory;
  });
});
