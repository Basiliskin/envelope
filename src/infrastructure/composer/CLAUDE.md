# CLAUDE.md — composer

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 12 source file(s) in `src/infrastructure/composer`.

## File Map

### argon2-calibration-adapter.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/composer/argon2-calibration-adapter.js:Argon2CalibrationAdapter,StaticArgon2Calibration`. Calls `src/infrastructure/composer/wasm-capabilities-adapter.js:InMemoryWasmProbe`. Uses `vitest`

### argon2-calibration-adapter.ts

- **Purpose:** Defines `Argon2CalibrationAdapter`, `StaticArgon2Calibration` classes.
- **Key elements:** `Argon2CalibrationAdapter`, `StaticArgon2Calibration`
- **Relations:** Calls `src/infrastructure/composer/composer-seal-driver.js:calibrateArgon2`. Imports `src/application/composer/composer-ports.js`. Imports `src/domain/credential/argon2-params.js`

### composer-seal-driver.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/composer/composer-seal-driver.js:ComposerSealDriver,calibrateArgon2`. Imports `src/domain/composer/file-basket.js`. Imports `src/infrastructure/crypto/kdf.js`. Uses `vitest`

### composer-seal-driver.ts

- **Purpose:** Defines `ComposerSealDriver` class; provides `calibrateArgon2` function.
- **Key elements:** `calibrateArgon2`, `ComposerSealDriver`
- **Relations:** Calls `src/application/composer/prepare-seal.js:prepareSeal`. Calls `src/domain/archive/manifest.js:createManifest`. Calls `src/infrastructure/archive/fflate-adapter.js:FflateArchiveWriter`. Calls `src/infrastructure/crypto/header-codec.js:encodeHeader`. Calls `src/infrastructure/crypto/kdf.js:deriveContentKey,deriveMasterKey`. Calls `src/infrastructure/crypto/stream-aead.js:sealStream`. Imports `src/application/ports/archive-ports.js`. Imports `src/domain/archive/archive.js`. Imports `src/domain/credential/argon2-params.js`

### credential-store.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/composer/credential-store.js:CredentialStore`. Uses `mobx`, `vitest`

### credential-store.ts

- **Purpose:** Defines `CredentialStore` class; declares `DialPosition` type.
- **Key elements:** `CredentialStore`, `DialPosition`
- **Relations:** Calls `src/domain/composer/credential-validation.js:validateComposerCredential`. Calls `src/domain/composer/entropy.js:combinedEntropyBits`. Uses `mobx`

### file-basket-store.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/composer/file-basket-store.js:FileBasketStore`. Uses `mobx`, `vitest`

### file-basket-store.ts

- **Purpose:** Defines `FileBasketStore` class.
- **Key elements:** `FileBasketStore`
- **Relations:** Imports `src/domain/composer/file-basket.js`. Uses `mobx`

### seal-store.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/composer/composer-seal-driver.js:ComposerSealDriver`. Calls `src/infrastructure/composer/credential-store.js:CredentialStore`. Calls `src/infrastructure/composer/file-basket-store.js:FileBasketStore`. Calls `src/infrastructure/composer/seal-store.js:SealStore`. Imports `src/application/ports/packaging-ports.js`. Uses `mobx`, `vitest`

### seal-store.ts

- **Purpose:** Defines `SealStore` class; declares `SealPhase`, `SealProgress` types.
- **Key elements:** `SealPhase`, `SealProgress`, `SealStore`
- **Relations:** Calls `src/application/composer/prepare-seal.js:prepareSeal`. Calls `src/domain/composer/seal-blocker.js:analyzeSealBlockers`. Imports `src/application/ports/packaging-ports.js`. Imports `src/domain/credential/argon2-params.js`. Imports `src/infrastructure/composer/composer-seal-driver.js`. Imports `src/infrastructure/composer/credential-store.js`. Imports `src/infrastructure/composer/file-basket-store.js`. Uses `mobx`

### wasm-capabilities-adapter.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/composer/wasm-capabilities-adapter.js:InMemoryWasmProbe,WebAssemblyMemoryProbe`. Uses `vitest`

### wasm-capabilities-adapter.ts

- **Purpose:** Defines `InMemoryWasmProbe`, `WebAssemblyMemoryProbe` classes.
- **Key elements:** `InMemoryWasmProbe`, `WebAssemblyMemoryProbe`
- **Relations:** Imports `src/application/composer/composer-ports.js`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
