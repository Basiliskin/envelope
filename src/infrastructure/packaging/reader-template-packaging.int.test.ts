import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { ReaderTemplatePackaging } from "./reader-template-packaging.js";

describe("ReaderTemplatePackaging", () => {
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

  it("embeds an arbitrary payload into the real built reader template", async () => {
    const packaging = new ReaderTemplatePackaging();
    const payload = new TextEncoder().encode("sealed package bytes");
    const html = await packaging.emit(payload);
    expect(html).toContain("<title>Envelope Reader</title>");
    expect(html).toMatch(
      /<script id="sealed-payload" type="application\/octet-stream">[A-Za-z0-9+/=]+<\/script>/,
    );
  });

  it("round-trips through the same base64 decode the reader entry uses", async () => {
    const packaging = new ReaderTemplatePackaging();
    const payload = crypto.getRandomValues(new Uint8Array(4096));
    const html = await packaging.emit(payload);
    const match = /id="sealed-payload" type="application\/octet-stream">([A-Za-z0-9+/=]+)<\/script>/.exec(
      html,
    );
    expect(match).not.toBeNull();
    const decoded = Uint8Array.from(atob(match?.[1] ?? ""), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(payload);
  });

  it("produces exactly one payload slot, never a JS string literal", async () => {
    const packaging = new ReaderTemplatePackaging();
    const html = await packaging.emit(new TextEncoder().encode("x"));
    const slots = html.match(/id="sealed-payload"/g) ?? [];
    expect(slots).toHaveLength(1);
  });
});
