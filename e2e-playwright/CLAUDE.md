# CLAUDE.md — e2e-playwright

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 3 source file(s) in `e2e-playwright`.

## File Map

### file-protocol.spec.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `e2e-playwright/helpers.js:ensureBuilt,sealThroughComposerUi,unsealThroughReaderUi,writeSealedHtmlToTempFile`. Uses `@playwright/test`

### helpers.ts

- **Purpose:** provides `composerHtmlPath`, `ensureBuilt`, `sealThroughComposerUi`, `serveDirectory`, `unsealThroughReaderUi` functions.
- **Key elements:** `composerHtmlPath`, `DIAL_POSITIONS`, `ensureBuilt`, `sealThroughComposerUi`, `serveDirectory`, `STRONG_PASSWORD`, `TEST_FILE_CONTENTS`, `TEST_FILE_NAME`, `unsealThroughReaderUi`
- **Relations:** Uses `@playwright/test`, `node:child_process`, `node:fs`, `node:http`, `node:net`, `node:os`, `node:path`

### https-protocol.spec.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `e2e-playwright/helpers.js:ensureBuilt,sealThroughComposerUi,serveDirectory,unsealThroughReaderUi`. Uses `@playwright/test`, `node:fs`, `node:os`, `node:path`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
