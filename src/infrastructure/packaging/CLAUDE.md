# CLAUDE.md — packaging

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 4 source file(s) in `src/infrastructure/packaging`.

## File Map

### reader-template-packaging.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/packaging/reader-template-packaging.js:ReaderTemplatePackaging`. Uses `node:child_process`, `node:fs`, `vitest`

### reader-template-packaging.ts

- **Purpose:** Defines `ReaderTemplatePackaging` class.
- **Key elements:** `ReaderTemplatePackaging`
- **Relations:** Calls `src/domain/packaging/package-template.js:injectPackagePayload`. Imports `src/application/ports/packaging-ports.js`

### reader-template.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/packaging/package-template.js:countPackagePayloadPlaceholders`. Uses `node:child_process`, `node:fs`, `vitest`

### reader-template.ts

- **Purpose:** Exports `readerTemplate`.
- **Key elements:** `readerTemplate`
- **Relations:** Imports `dist-reader/reader.html?raw`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
