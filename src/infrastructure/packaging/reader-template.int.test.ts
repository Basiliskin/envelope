import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { countPackagePayloadPlaceholders } from "../../domain/packaging/package-template.js";

describe("readerTemplate", () => {
  beforeAll(() => {
    if (existsSync("dist-reader")) {
      rmSync("dist-reader", { recursive: true, force: true });
    }
    execSync("npm run build:reader --silent", { stdio: "ignore" });
  }, 30_000);

  afterAll(() => {
    if (existsSync("dist-reader")) {
      rmSync("dist-reader", { recursive: true, force: true });
    }
  });

  it("imports the built reader.html as a raw string", async () => {
    const { readerTemplate } = await import("./reader-template.js");
    expect(readerTemplate).toContain("<title>Envelope Reader</title>");
    expect(readerTemplate).toMatch(/^<!doctype html>/i);
  });

  it("ships exactly one sealed-payload placeholder — the build-time assertion M6 requires", async () => {
    const { readerTemplate } = await import("./reader-template.js");
    expect(countPackagePayloadPlaceholders(readerTemplate)).toBe(1);
  });
});
