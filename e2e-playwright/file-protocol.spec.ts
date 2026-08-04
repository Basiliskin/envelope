import { expect, test } from "@playwright/test";
import {
  composerHtmlPath,
  DIAL_POSITIONS,
  ensureBuilt,
  sealThroughComposerUi,
  STRONG_PASSWORD,
  TEST_FILE_CONTENTS,
  unsealThroughReaderUi,
  writeSealedHtmlToTempFile,
} from "./helpers.js";

test.beforeAll(() => {
  ensureBuilt();
});

test("seals in the composer and unseals in the reader, both loaded over file://", async ({ page }) => {
  await page.goto(`file://${composerHtmlPath()}`);
  const sealedHtml = await sealThroughComposerUi(page);

  const readerUrl = writeSealedHtmlToTempFile(sealedHtml);
  await page.goto(readerUrl);
  const result = await unsealThroughReaderUi(page, {
    password: STRONG_PASSWORD,
    combination: DIAL_POSITIONS,
  });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.text).toBe(TEST_FILE_CONTENTS);
  }
});
