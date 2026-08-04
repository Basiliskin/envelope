import { encodeBase64 } from "./base64.js";

export const SEALED_PAYLOAD_ELEMENT_ID = "sealed-payload";

export class PackagingTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackagingTemplateError";
  }
}

function placeholderPattern(): RegExp {
  // Capture the opening tag and closing tag separately so injection
  // preserves whatever attributes the template author wrote, while the
  // (should-be-empty) body is discarded and replaced with the payload.
  return /(<script\b[^>]*\bid="sealed-payload"[^>]*>)([\s\S]*?)(<\/script>)/g;
}

/**
 * Injects a sealed package into the reader template's payload slot.
 *
 * The payload goes into `<script type="application/octet-stream">` as
 * base64 text content, never into a JS string literal — string-literal
 * injection invites escaping bugs (a stray `</script>` or backslash in the
 * "text" turning into executable JS). A malformed or duplicated placeholder
 * fails loudly instead of silently sealing into the wrong slot.
 */
export function injectPackagePayload(
  template: string,
  payloadBytes: Uint8Array,
): string {
  const matches = [...template.matchAll(placeholderPattern())];
  if (matches.length === 0) {
    throw new PackagingTemplateError(
      `No "#${SEALED_PAYLOAD_ELEMENT_ID}" payload placeholder found in the reader template.`,
    );
  }
  if (matches.length > 1) {
    throw new PackagingTemplateError(
      `Expected exactly one "#${SEALED_PAYLOAD_ELEMENT_ID}" payload placeholder, found ${String(matches.length)}.`,
    );
  }

  const payloadBase64 = encodeBase64(payloadBytes);
  return template.replace(
    placeholderPattern(),
    (_match, open: string, _body: string, close: string) =>
      `${open}${payloadBase64}${close}`,
  );
}

/**
 * Counts payload placeholders without injecting anything — used as a
 * build-time assertion that the shipped reader template still has exactly
 * one slot before a release build embeds anything into it.
 */
export function countPackagePayloadPlaceholders(template: string): number {
  return [...template.matchAll(placeholderPattern())].length;
}
