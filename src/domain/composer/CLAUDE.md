# CLAUDE.md — composer

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 10 source file(s) in `src/domain/composer`.

## File Map

### credential-validation.ts

- **Purpose:** provides `validateComposerCredential` function; declares `CredentialIssue`, `CredentialIssueCode` types.
- **Key elements:** `CredentialIssue`, `CredentialIssueCode`, `validateComposerCredential`
- **Relations:** Imports `src/domain/credential/safe-combination.js`

### credential-validation.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/composer/credential-validation.js:validateComposerCredential`. Uses `vitest`

### diceware.ts

- **Purpose:** provides `dicewareListLength`, `generateDiceware` functions; declares `DicewareRng` type.
- **Key elements:** `DICEWARE_LIST`, `dicewareListLength`, `DicewareRng`, `generateDiceware`

### diceware.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/composer/diceware.js:dicewareListLength,generateDiceware`. Uses `vitest`

### entropy.ts

- **Purpose:** provides `combinedEntropyBits`, `dialEntropyBits`, `passwordEntropyBits` functions.
- **Key elements:** `combinedEntropyBits`, `DIAL_ENTROPY_BITS`, `dialEntropyBits`, `passwordEntropyBits`

### entropy.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/composer/entropy.js:combinedEntropyBits,dialEntropyBits,passwordEntropyBits`. Uses `vitest`

### file-basket.ts

- **Purpose:** Defines `FileBasket`, `FileBasketCapExceededError` classes; declares `FileBasketEntry` type.
- **Key elements:** `FileBasket`, `FileBasketCapExceededError`, `FileBasketEntry`

### file-basket.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Imports `src/domain/composer/file-basket.js`. Uses `vitest`

### seal-blocker.ts

- **Purpose:** provides `analyzeSealBlockers`, `dialBits`, `passwordBits` functions; declares `SealBlocker`, `SealBlockerCode` types.
- **Key elements:** `analyzeSealBlockers`, `dialBits`, `MIN_COMBINED_ENTROPY_BITS`, `passwordBits`, `SealBlocker`, `SealBlockerCode`
- **Relations:** Calls `src/domain/composer/credential-validation.js:validateComposerCredential`. Calls `src/domain/composer/entropy.js:combinedEntropyBits,passwordEntropyBits`. Imports `src/domain/composer/file-basket.js`. Imports `src/domain/credential/argon2-params.js`

### seal-blocker.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/composer/seal-blocker.js:analyzeSealBlockers`. Imports `src/domain/composer/file-basket.js`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
