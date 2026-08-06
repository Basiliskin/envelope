# CLAUDE.md — reader

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 5 source file(s) in `src/domain/reader`.

## File Map

### backoff.ts

- **Purpose:** provides `exponentialBackoffMs` function.
- **Key elements:** `exponentialBackoffMs`

### backoff.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/reader/backoff.js:exponentialBackoffMs`. Uses `vitest`

### sealed-package.ts

- **Purpose:** Defines `InvalidSealedPackageError` class; provides `parseSealedPackage` function.
- **Key elements:** `InvalidSealedPackageError`, `parseSealedPackage`
- **Relations:** Calls `src/infrastructure/crypto/header-codec.js:decodeHeader`. Imports `src/domain/reader/types.js`

### sealed-package.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/reader/sealed-package.js:parseSealedPackage`. Calls `src/infrastructure/crypto/header-codec.js:encodeHeader`. Imports `src/domain/credential/argon2-params.js`. Uses `vitest`

### types.ts

- **Purpose:** declares `ParsedSealedPackage`, `ReaderCredential`, `ReaderFile`, `ReaderProgress`, `ReaderProgressPhase` types.
- **Key elements:** `ParsedSealedPackage`, `ReaderCredential`, `ReaderFile`, `ReaderProgress`, `ReaderProgressPhase`
- **Relations:** Imports `src/domain/credential/safe-combination.js`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
