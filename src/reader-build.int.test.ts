import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ARTIFACT = "dist-reader/reader.html";

describe("reader build", () => {
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

  it("emits a self-contained reader with an octet-stream payload slot", () => {
    const contents = readFileSync(ARTIFACT, "utf8");
    expect(contents).toContain("<title>Envelope Reader</title>");
    expect(contents).toContain('type="application/octet-stream"');
    const scriptTags = contents.match(/<script\b[^>]*>/g) ?? [];
    expect(scriptTags.every((tag) => !/\ssrc=/.test(tag))).toBe(true);
  });

  it("stays within the reader budget excluding the bundled Argon2 wasm", () => {
    const contents = readFileSync(ARTIFACT, "utf8");
    const withoutWasm = contents.replace(
      /AGFzbQE[A-Za-z0-9+/=]+/g,
      "",
    );
    expect(gzipSync(withoutWasm).byteLength).toBeLessThan(80 * 1024);
  });
});
