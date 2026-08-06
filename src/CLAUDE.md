# CLAUDE.md — src

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 9 source file(s) in `src`.

## File Map

### composer-build.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Uses `node:child_process`, `node:fs`, `vitest`

### composer.e2e.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/composer.js:mountComposer`. Uses `happy-dom`, `vitest`

### composer.tsx

- **Purpose:** provides `autoMount`, `mountComposer` functions.
- **Key elements:** `autoMount`, `buildDefaultComposer`, `ComposerApp`, `mountComposer`
- **Relations:** Calls `src/composer/composer-app.js:buildDefaultComposer`. Imports `src/shared/app.css`. Uses `react-dom`

### m8-test-matrix.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/application/reader/unseal-package.js:UnsealPackage`. Calls `src/infrastructure/archive/fflate-adapter.js:FflateReaderArchive`. Calls `src/infrastructure/composer/composer-seal-driver.js:ComposerSealDriver`. Calls `src/infrastructure/reader/browser-reader-crypto.js:BrowserReaderCrypto`. Imports `src/application/reader/reader-ports.js`. Imports `src/domain/composer/file-basket.js`. Imports `src/domain/reader/sealed-package.js`. Uses `vitest`

### reader-build-reproducible.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Uses `node:child_process`, `node:crypto`, `node:fs`, `vitest`

### reader-build.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Uses `node:child_process`, `node:fs`, `node:zlib`, `vitest`

### reader.e2e.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/crypto/header-codec.js:encodeHeader`. Calls `src/reader.js:mountReader`. Imports `src/domain/credential/argon2-params.js`. Uses `happy-dom`, `vitest`

### reader.tsx

- **Purpose:** provides `autoMount`, `buildReaderStore`, `mountReader`, `readEmbeddedPackage` functions.
- **Key elements:** `autoMount`, `buildReaderStore`, `mountReader`, `readEmbeddedPackage`
- **Relations:** Calls `src/infrastructure/reader/reader-factory.js:ReaderFactory`. Imports `src/domain/packaging/package-template.js`. Imports `src/infrastructure/reader/reader-store.js`. Imports `src/reader/reader-app.js`. Imports `src/shared/app.css`. Uses `react-dom`

### vite-env.d.ts

- **Purpose:** Module with no detected exports.

## Subfolders

- `composer/` → see [CLAUDE.md](./composer/CLAUDE.md)
- `reader/` → see [CLAUDE.md](./reader/CLAUDE.md)
- `shared/` → see [CLAUDE.md](./shared/CLAUDE.md)

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
