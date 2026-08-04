import { execSync } from "node:child_process";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Page } from "@playwright/test";

export const STRONG_PASSWORD = "correct horse battery staple extra";
export const DIAL_POSITIONS: readonly [number, number, number] = [37, 12, 88];
export const TEST_FILE_NAME = "note.txt";
export const TEST_FILE_CONTENTS = "Hello from the M8 Playwright matrix.";

let builtOnce = false;

/** Builds both apps once per test run; skipped if dist output already exists. */
export function ensureBuilt(): void {
  if (builtOnce) return;
  if (
    !existsSync("dist-composer/composer.html") ||
    !existsSync("dist-reader/reader.html")
  ) {
    execSync("npm run build", { stdio: "inherit" });
  }
  builtOnce = true;
}

export function composerHtmlPath(): string {
  return join(process.cwd(), "dist-composer", "composer.html");
}

/** Serves a directory over plain HTTP on localhost, standing in for a
 * non-file:// origin. TLS specifics are irrelevant to the restrictions this
 * roadmap cares about (SharedArrayBuffer, blob-URL workers, module fetch);
 * what matters is "not file://", which a local HTTP server already is.
 * The URL must use the hostname "localhost", not "127.0.0.1" — WebKit only
 * treats "localhost" as a secure context, and `crypto.subtle` (used
 * throughout the KDF/AEAD pipeline) silently hangs on an insecure origin. */
export function serveDirectory(
  dir: string,
): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server: Server = createServer((req, res) => {
      const path =
        req.url === "/" ? "/composer.html" : (req.url ?? "/composer.html");
      const filePath = join(dir, decodeURIComponent(path));
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(filePath));
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({
        url: `http://localhost:${String(address.port)}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

/** Drives the real composer UI: uploads one small file, fills a strong
 * password + valid dial, seals, and returns the sealed reader HTML bytes
 * fetched straight from the in-page blob URL (no reliance on the browser's
 * native download UI, which behaves inconsistently across engines). */
export async function sealThroughComposerUi(page: Page): Promise<string> {
  await page.setInputFiles('input[type="file"]', {
    name: TEST_FILE_NAME,
    mimeType: "text/plain",
    buffer: Buffer.from(TEST_FILE_CONTENTS, "utf-8"),
  });
  await page.getByTestId("password-input").fill(STRONG_PASSWORD);
  await page.getByTestId("dial-round-1-number").fill(String(DIAL_POSITIONS[0]));
  await page.getByTestId("dial-round-2-number").fill(String(DIAL_POSITIONS[1]));
  await page.getByTestId("dial-round-3-number").fill(String(DIAL_POSITIONS[2]));
  await page.getByTestId("dial-lock").click();
  await page.getByTestId("seal-button").click();
  const download = page.getByTestId("seal-download");
  await download.waitFor({ state: "attached", timeout: 30_000 });
  const url = await download.getAttribute("href");
  if (url === null)
    throw new Error("Sealed envelope did not produce a download URL.");
  return page.evaluate(async (blobUrl) => {
    const response = await fetch(blobUrl);
    return response.text();
  }, url);
}

/** Writes the sealed HTML to a temp file and returns its file:// URL. */
export function writeSealedHtmlToTempFile(html: string): string {
  const dir = mkdtempSync(join(tmpdir(), "envelope-e2e-"));
  const path = join(dir, "sealed.html");
  writeFileSync(path, html, "utf-8");
  return `file://${path}`;
}

/** Drives the real reader UI: fills the same credential, opens attachments,
 * and returns the plaintext bytes of the first decrypted file by hooking
 * URL.createObjectURL in-page rather than relying on a native download. */
export async function unsealThroughReaderUi(
  page: Page,
  credential: {
    password: string;
    combination: readonly [number, number, number];
  },
): Promise<{ ok: true; text: string } | { ok: false; errorText: string }> {
  await page.evaluate(() => {
    const w = window as unknown as { __capturedBlob?: Blob };
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob): string => {
      w.__capturedBlob = blob;
      return original(blob);
    };
  });
  await page.locator("#reader-password").fill(credential.password);
  await page
    .getByTestId("dial-round-1-number")
    .fill(String(credential.combination[0]));
  await page
    .getByTestId("dial-round-2-number")
    .fill(String(credential.combination[1]));
  await page
    .getByTestId("dial-round-3-number")
    .fill(String(credential.combination[2]));
  await page.getByTestId("dial-lock").click();
  await page.getByTestId("reader-unseal").click();

  const result = await Promise.race([
    page
      .getByTestId("reader-downloads")
      .waitFor({ state: "visible", timeout: 45_000 })
      .then(() => "done" as const),
    page
      .getByTestId("reader-error")
      .waitFor({ state: "visible", timeout: 45_000 })
      .then(() => "error" as const),
  ]);

  if (result === "error") {
    const errorText =
      (await page.getByTestId("reader-error").textContent()) ?? "";
    return { ok: false, errorText };
  }

  await page.locator("button", { hasText: "Download all" }).click();
  const text = await page.evaluate(async () => {
    const w = window as unknown as { __capturedBlob?: Blob };
    if (w.__capturedBlob === undefined) throw new Error("No blob captured.");
    return w.__capturedBlob.text();
  });
  return { ok: true, text };
}
