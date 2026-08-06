# CLAUDE.md — reader

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 3 source file(s) in `src/application/reader`.

## File Map

### reader-ports.ts

- **Purpose:** declares `MemoryPreflightPort`, `ReaderArchivePort`, `ReaderCryptoPort` types.
- **Key elements:** `MemoryPreflightPort`, `ReaderArchivePort`, `ReaderCryptoPort`
- **Relations:** Imports `src/domain/reader/types.js`

### unseal-package.ts

- **Purpose:** Defines `ReaderMemoryError`, `UnsealPackage` classes.
- **Key elements:** `ReaderMemoryError`, `UnsealPackage`
- **Relations:** Calls `src/domain/credential/secret.js:canonicalizeSecret`. Calls `src/domain/reader/sealed-package.js:parseSealedPackage`. Imports `src/application/reader/reader-ports.js`. Imports `src/domain/credential/safe-combination.js`. Imports `src/domain/reader/types.js`

### unseal-package.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/application/reader/unseal-package.js:UnsealPackage`. Calls `src/infrastructure/crypto/header-codec.js:encodeHeader`. Imports `src/application/reader/reader-ports.js`. Imports `src/domain/credential/argon2-params.js`. Imports `src/domain/reader/types.js`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
