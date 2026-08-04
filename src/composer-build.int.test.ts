import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";

const ARTIFACT = "dist-composer/composer.html";

describe("composer SPA build", () => {
  beforeAll(() => {
    if (existsSync(ARTIFACT)) {
      rmSync(ARTIFACT);
    }
    execSync("npm run build:composer --silent", { stdio: "ignore" });
  }, 30_000);

  afterAll(() => {
    if (existsSync("dist-composer")) {
      rmSync("dist-composer", { recursive: true, force: true });
    }
    if (existsSync("dist-reader")) {
      rmSync("dist-reader", { recursive: true, force: true });
    }
  });

  it("emits a single self-contained HTML file", () => {
    expect(existsSync(ARTIFACT)).toBe(true);
    const contents = readFileSync(ARTIFACT, "utf8");
    expect(contents).toMatch(/^<!doctype html>/i);
    expect(contents).toContain("<title>Envelope Composer</title>");
    expect(contents).toContain("Envelope Composer");
  });

  it("inlines the React bundle, no external script src", () => {
    const contents = readFileSync(ARTIFACT, "utf8");
    const scriptTags = contents.match(/<script\b[^>]*>/g) ?? [];
    for (const tag of scriptTags) {
      expect(tag.toLowerCase()).not.toMatch(/src=/);
    }
  });

  it("stays under a 1 MiB payload", () => {
    const buffer = readFileSync(ARTIFACT);
    expect(buffer.byteLength).toBeLessThan(1024 * 1024);
  });
});
