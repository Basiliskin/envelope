import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Window } from "happy-dom";
import { mountComposer } from "./composer.js";

interface GlobalWithDom {
  document: Document;
  window: Window;
}

const window = new Window();
const global = globalThis as unknown as GlobalWithDom;
global.document = window.document as unknown as Document;
global.window = window;

const flushMicrotasks = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

function mount(): () => void {
  return mountComposer(window.document.body as unknown as HTMLElement);
}

beforeEach(() => {
  window.document.body.innerHTML = "";
});

afterEach(() => {
  window.document.body.innerHTML = "";
});

describe("composer e2e", () => {
  it("mounts the composer shell and renders every section", async () => {
    const cleanup = mount();
    await flushMicrotasks();
    const root = window.document.body.querySelector(
      '[data-testid="composer-app"]',
    );
    expect(root).toBeTruthy();
    expect(
      window.document.body.querySelector('[data-testid="file-basket"]'),
    ).toBeTruthy();
    expect(
      window.document.body.querySelector('[data-testid="password-field"]'),
    ).toBeTruthy();
    expect(
      window.document.body.querySelector('[data-testid="safe-dial"]'),
    ).toBeTruthy();
    expect(
      window.document.body.querySelector(
        '[data-testid="combined-entropy"]',
      ),
    ).toBeTruthy();
    expect(
      window.document.body.querySelector('[data-testid="seal-progress"]'),
    ).toBeTruthy();
    cleanup();
  });

  it("renders every section heading and root data-testid", async () => {
    const cleanup = mount();
    await flushMicrotasks();
    const shell = window.document.body.querySelector(
      '[data-testid="composer-app"]',
    );
    expect(shell?.textContent).toMatch(/Envelope Composer/);
    expect(
      window.document.body.querySelector('[data-testid="file-basket"] h2')
        ?.textContent,
    ).toBe("Files");
    expect(
      window.document.body.querySelector('[data-testid="password-field"] h2')
        ?.textContent,
    ).toBe("Password");
    expect(
      window.document.body.querySelector('[data-testid="safe-dial"] h2')
        ?.textContent,
    ).toBe("Safe combination");
    expect(
      window.document.body.querySelector('[data-testid="combined-entropy"] h2')
        ?.textContent,
    ).toBe("Combined entropy");
    expect(
      window.document.body.querySelector('[data-testid="seal-progress"] h2')
        ?.textContent,
    ).toBe("Seal");
    cleanup();
  });

  it("initially reports an empty basket and an adjustable dial", async () => {
    const cleanup = mount();
    await flushMicrotasks();
    expect(
      window.document.body
        .querySelector('[data-testid="basket-empty"]')
        ?.textContent,
    ).toMatch(/No files/);
    expect(
      window.document.body.querySelector('[data-testid="dial-status"]')
        ?.textContent,
    ).toMatch(/adjustable/);
    cleanup();
  });

  it("renders all three rounds of the dial with labeled controls", async () => {
    const cleanup = mount();
    await flushMicrotasks();
    for (const round of [1, 2, 3] as const) {
      expect(
        window.document.body.querySelector(
          `[data-testid="dial-round-${String(round)}-input"]`,
        ),
      ).toBeTruthy();
      expect(
        window.document.body.querySelector(
          `[data-testid="dial-round-${String(round)}-number"]`,
        ),
      ).toBeTruthy();
      expect(
        window.document.body.querySelector(
          `[data-testid="dial-round-${String(round)}-clear"]`,
        ),
      ).toBeTruthy();
    }
    cleanup();
  });
});
