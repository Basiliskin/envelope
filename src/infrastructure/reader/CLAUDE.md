# CLAUDE.md — reader

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 5 source file(s) in `src/infrastructure/reader`.

## File Map

### browser-memory-preflight.ts

- **Purpose:** Defines `BrowserMemoryPreflight` class.
- **Key elements:** `BrowserMemoryPreflight`
- **Relations:** Imports `src/application/reader/reader-ports.js`

### browser-reader-crypto.ts

- **Purpose:** Defines `BrowserReaderCrypto` class.
- **Key elements:** `BrowserReaderCrypto`
- **Relations:** Calls `src/infrastructure/crypto/header-codec.js:decodeHeader`. Calls `src/infrastructure/crypto/kdf.js:deriveContentKey,deriveMasterKey`. Calls `src/infrastructure/crypto/stream-aead.js:unsealStream`. Imports `src/application/reader/reader-ports.js`

### reader-factory.ts

- **Purpose:** Exports `ReaderFactory`.
- **Key elements:** `ReaderFactory`
- **Relations:** Calls `src/application/reader/unseal-package.js:UnsealPackage`. Calls `src/infrastructure/archive/fflate-adapter.js:FflateReaderArchive`. Calls `src/infrastructure/reader/browser-memory-preflight.js:BrowserMemoryPreflight`. Calls `src/infrastructure/reader/browser-reader-crypto.js:BrowserReaderCrypto`. Calls `src/infrastructure/reader/reader-store.js:ReaderStore`

### reader-store.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/application/reader/unseal-package.js:UnsealPackage`. Calls `src/infrastructure/crypto/header-codec.js:encodeHeader`. Calls `src/infrastructure/reader/reader-store.js:ReaderStore`. Imports `src/application/reader/reader-ports.js`. Imports `src/domain/credential/argon2-params.js`. Uses `vitest`

### reader-store.ts

- **Purpose:** Defines `ReaderStore` class; declares `ReaderState` type.
- **Key elements:** `ReaderState`, `ReaderStore`
- **Relations:** Calls `src/domain/reader/backoff.js:exponentialBackoffMs`. Imports `src/application/reader/unseal-package.js`. Imports `src/domain/reader/types.js`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
