# CLAUDE.md — composer

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 3 source file(s) in `src/application/composer`.

## File Map

### composer-ports.ts

- **Purpose:** declares `Argon2CalibrationPort`, `Argon2CalibrationResult`, `BundleEmitterInput`, `BundleEmitterPort`, `WasmCapabilitiesPort`, `WasmCapabilitiesResult` types.
- **Key elements:** `Argon2CalibrationPort`, `Argon2CalibrationResult`, `BundleEmitterInput`, `BundleEmitterPort`, `WasmCapabilitiesPort`, `WasmCapabilitiesResult`
- **Relations:** Imports `src/domain/credential/argon2-params.js`

### prepare-seal.ts

- **Purpose:** provides `prepareSeal` function; declares `PrepareSealInput`, `PrepareSealResult` types.
- **Key elements:** `prepareSeal`, `PrepareSealInput`, `PrepareSealResult`
- **Relations:** Calls `src/domain/composer/seal-blocker.js:analyzeSealBlockers`. Calls `src/domain/credential/secret.js:canonicalizeSecret`. Imports `src/application/ports/worker-ports.js`. Imports `src/domain/composer/file-basket.js`. Imports `src/domain/credential/argon2-params.js`. Imports `src/domain/credential/safe-combination.js`

### prepare-seal.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/application/composer/prepare-seal.js:prepareSeal`. Imports `src/domain/composer/file-basket.js`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
