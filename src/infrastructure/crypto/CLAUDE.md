# CLAUDE.md — crypto

**Last updated:** 2026-08-04
**Mode:** Flat

## Overview
Contains 6 source file(s) in `src/infrastructure/crypto`.

## File Map

### header-codec.int.test.ts
- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/crypto/header-codec.js:decodeHeader,encodeHeader`. Imports `src/domain/credential/argon2-params.js`. Uses `vitest`

### header-codec.ts
- **Purpose:** Defines `InvalidHeaderError` class; provides `decodeHeader`, `encodeHeader` functions; declares `Spk1Header` type.
- **Key elements:** `decodeHeader`, `encodeHeader`, `InvalidHeaderError`, `SPK1_DEFAULT_CHUNK_SIZE`, `SPK1_HEADER_SIZE`, `SPK1_NONCE_PREFIX_SIZE`, `SPK1_SALT_SIZE`, `SPK1_VERSION`, `Spk1Header`
- **Relations:** Imports `src/domain/credential/argon2-params.js`

### kdf.int.test.ts
- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/crypto/kdf.js:deriveContentKey,deriveMasterKey`. Imports `src/domain/credential/argon2-params.js`. Uses `vitest`

### kdf.ts
- **Purpose:** provides `deriveContentKey`, `deriveMasterKey` functions; declares `Argon2DeriveInput` type.
- **Key elements:** `Argon2DeriveInput`, `deriveContentKey`, `deriveMasterKey`
- **Relations:** Imports `src/domain/credential/argon2-params.js`. Uses `hash-wasm`

### stream-aead.int.test.ts
- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/crypto/stream-aead.js:sealStream,unsealStream`. Uses `fast-check`, `vitest`

### stream-aead.ts
- **Purpose:** Defines `AuthenticationError` class; provides `sealStream`, `unsealStream` functions; declares `SealedChunk`, `SealStreamInput`, `UnsealStreamInput` types.
- **Key elements:** `AuthenticationError`, `SealedChunk`, `sealStream`, `SealStreamInput`, `unsealStream`, `UnsealStreamInput`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
