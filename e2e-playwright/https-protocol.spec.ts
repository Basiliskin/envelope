import { expect, test } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DIAL_POSITIONS,
  ensureBuilt,
  sealThroughComposerUi,
  serveDirectory,
  STRONG_PASSWORD,
  TEST_FILE_CONTENTS,
  unsealThroughReaderUi,
} from "./helpers.js";

test.beforeAll(() => {
  ensureBuilt();
});

test("seals in the composer and unseals in the reader, both served over http(s)", async ({
  page,
}) => {
  const composer = await serveDirectory(join(process.cwd(), "dist-composer"));
  try {
    await page.goto(`${composer.url}/composer.html`);
    const sealedHtml = await sealThroughComposerUi(page);

    const dir = mkdtempSync(join(tmpdir(), "envelope-e2e-served-"));
    writeFileSync(join(dir, "sealed.html"), sealedHtml, "utf-8");
    const reader = await serveDirectory(dir);
    try {
      await page.goto(`${reader.url}/sealed.html`);
      const result = await unsealThroughReaderUi(page, {
        password: STRONG_PASSWORD,
        combination: DIAL_POSITIONS,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.text).toBe(TEST_FILE_CONTENTS);
      }
    } finally {
      await reader.close();
    }
  } finally {
    await composer.close();
  }
});

test("rejects a wrong password with the same generic error the whole way through a real browser", async ({
  page,
}) => {
  const composer = await serveDirectory(join(process.cwd(), "dist-composer"));
  try {
    await page.goto(`${composer.url}/composer.html`);
    const sealedHtml = await sealThroughComposerUi(page);

    const dir = mkdtempSync(join(tmpdir(), "envelope-e2e-served-"));
    writeFileSync(join(dir, "sealed.html"), sealedHtml, "utf-8");
    const reader = await serveDirectory(dir);
    try {
      await page.goto(`${reader.url}/sealed.html`);
      const result = await unsealThroughReaderUi(page, {
        password: "definitely the wrong password",
        combination: DIAL_POSITIONS,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // The one and only failure message the reader ever shows — the
        // same text a wrong-dial guess would produce. No partial-credit
        // detail (e.g. "wrong password" vs "wrong combination" vs a
        // weak-combination complaint) may leak through.
        expect(result.errorText).toContain(
          "Unable to open package. Check your password and safe combination.",
        );
      }
    } finally {
      await reader.close();
    }
  } finally {
    await composer.close();
  }
});
