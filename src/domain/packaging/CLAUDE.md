# CLAUDE.md — packaging

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 4 source file(s) in `src/domain/packaging`.

## File Map

### base64.ts

- **Purpose:** provides `encodeBase64` function.
- **Key elements:** `encodeBase64`

### base64.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/packaging/base64.js:encodeBase64`. Uses `fast-check`, `vitest`

### package-template.ts

- **Purpose:** Defines `PackagingTemplateError` class; provides `countPackagePayloadPlaceholders`, `injectPackagePayload` functions.
- **Key elements:** `countPackagePayloadPlaceholders`, `injectPackagePayload`, `PackagingTemplateError`, `SEALED_PAYLOAD_ELEMENT_ID`
- **Relations:** Calls `src/domain/packaging/base64.js:encodeBase64`

### package-template.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/packaging/base64.js:encodeBase64`. Calls `src/domain/packaging/package-template.js:countPackagePayloadPlaceholders,injectPackagePayload`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
