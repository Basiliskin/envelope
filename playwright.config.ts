import { defineConfig, devices } from "@playwright/test";

// M8 cross-browser matrix. "webkit" stands in for Safari (no Linux/Windows
// Safari exists to automate against); real Safari is covered by the manual
// pre-release checklist in docs/release-checklist.md. Edge is Chromium —
// covered by the "chromium" project, same caveat noted in the checklist.
export default defineConfig({
  testDir: "./e2e-playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // Generous: a full round trip runs the real Argon2id KDF twice (seal +
  // unseal) at the composer's default 512 MiB preset. That's ~1-2s in
  // Chromium/Firefox but has been observed to take ~30s per pass in
  // WebKit's WASM implementation under headless automation.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
