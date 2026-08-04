# CLAUDE.md — credential

**Last updated:** 2026-08-04
**Mode:** Flat

## Overview
Contains 6 source file(s) in `src/domain/credential`.

## File Map

### argon2-params.ts
- **Purpose:** Defines `Argon2Params`, `InvalidArgon2ParamsError` classes; declares `Argon2ParamsValue` type.
- **Key elements:** `Argon2Params`, `Argon2ParamsValue`, `InvalidArgon2ParamsError`

### argon2-params.unit.test.ts
- **Purpose:** Module with no detected exports.
- **Relations:** Imports `src/domain/credential/argon2-params.js`. Uses `vitest`

### safe-combination.ts
- **Purpose:** Defines `InvalidSafeCombinationError`, `SafeCombination` classes; declares `DialDirection`, `SafeCombinationValue` types.
- **Key elements:** `DialDirection`, `InvalidSafeCombinationError`, `SafeCombination`, `SafeCombinationValue`

### safe-combination.unit.test.ts
- **Purpose:** Module with no detected exports.
- **Relations:** Imports `src/domain/credential/safe-combination.js`. Uses `vitest`

### secret.ts
- **Purpose:** Defines `Password` class; provides `canonicalizeSecret` function.
- **Key elements:** `canonicalizeSecret`, `Password`
- **Relations:** Imports `src/domain/credential/safe-combination.js`

### secret.unit.test.ts
- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/credential/secret.js:canonicalizeSecret`. Imports `src/domain/credential/safe-combination.js`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
