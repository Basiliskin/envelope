import { describe, expect, it } from "vitest";
import {
  countPackagePayloadPlaceholders,
  injectPackagePayload,
  PackagingTemplateError,
  SEALED_PAYLOAD_ELEMENT_ID,
} from "./package-template.js";
import { encodeBase64 } from "./base64.js";

const TEMPLATE = `<!doctype html>
<html>
  <body>
    <div id="root"></div>
    <script id="${SEALED_PAYLOAD_ELEMENT_ID}" type="application/octet-stream"></script>
    <script type="module" src="/src/reader.tsx"></script>
  </body>
</html>`;

describe("SEALED_PAYLOAD_ELEMENT_ID", () => {
  it("matches the id reader.html and reader.tsx agree on", () => {
    expect(SEALED_PAYLOAD_ELEMENT_ID).toBe("sealed-payload");
  });
});

describe("countPackagePayloadPlaceholders", () => {
  it("finds exactly one placeholder in a well-formed template", () => {
    expect(countPackagePayloadPlaceholders(TEMPLATE)).toBe(1);
  });

  it("counts zero when the placeholder is missing", () => {
    expect(countPackagePayloadPlaceholders("<html></html>")).toBe(0);
  });

  it("counts duplicates", () => {
    const doubled = TEMPLATE + TEMPLATE;
    expect(countPackagePayloadPlaceholders(doubled)).toBe(2);
  });
});

describe("injectPackagePayload", () => {
  it("embeds the base64 payload inside the octet-stream script tag", () => {
    const payload = new TextEncoder().encode("hello world");
    const result = injectPackagePayload(TEMPLATE, payload);
    expect(result).toContain(
      `id="sealed-payload" type="application/octet-stream">${encodeBase64(payload)}</script>`,
    );
  });

  it("preserves the rest of the document untouched", () => {
    const payload = new TextEncoder().encode("x");
    const result = injectPackagePayload(TEMPLATE, payload);
    expect(result).toContain(
      '<script type="module" src="/src/reader.tsx"></script>',
    );
    expect(result).toContain('<div id="root"></div>');
  });

  it("never places the payload inside a JS string literal", () => {
    const payload = new TextEncoder().encode(
      "</script><script>alert(1)</script>",
    );
    const result = injectPackagePayload(TEMPLATE, payload);
    // The base64 alphabet excludes `<`, `>`, `"`, `'` entirely — a hostile
    // payload cannot break out of the octet-stream tag.
    const injected =
      /<script id="sealed-payload" type="application\/octet-stream">([^<]*)<\/script>/.exec(
        result,
      );
    expect(injected).not.toBeNull();
    expect(injected?.[1]).toMatch(/^[A-Za-z0-9+/=]*$/);
  });

  it("throws PackagingTemplateError when the placeholder is missing", () => {
    expect(() =>
      injectPackagePayload("<html></html>", new Uint8Array()),
    ).toThrow(PackagingTemplateError);
  });

  it("throws PackagingTemplateError when the placeholder is duplicated", () => {
    const doubled = TEMPLATE + TEMPLATE;
    expect(() => injectPackagePayload(doubled, new Uint8Array())).toThrow(
      PackagingTemplateError,
    );
  });

  it("round-trips an empty payload", () => {
    const result = injectPackagePayload(TEMPLATE, new Uint8Array());
    expect(result).toContain(
      'id="sealed-payload" type="application/octet-stream"></script>',
    );
  });
});
