# CLAUDE.md — composer

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 5 source file(s) in `src/composer`.

## File Map

### combined-entropy.tsx

- **Purpose:** provides `describeBlockers` function; declares `CombinedEntropyProps`, `SealProgressViewProps` types.
- **Key elements:** `CombinedEntropy`, `CombinedEntropyProps`, `describeBlockers`, `SealProgressView`, `SealProgressViewProps`
- **Relations:** Calls `src/domain/composer/seal-blocker.js:analyzeSealBlockers`. Imports `src/domain/credential/argon2-params.js`. Imports `src/infrastructure/composer/credential-store.js`. Imports `src/infrastructure/composer/file-basket-store.js`. Imports `src/infrastructure/composer/seal-store.js`. Uses `mobx-react-lite`

### composer-app.tsx

- **Purpose:** provides `buildDefaultComposer` function; declares `ComposerAppProps` type.
- **Key elements:** `buildDefaultComposer`, `ComposerApp`, `ComposerAppProps`
- **Relations:** Calls `src/domain/composer/diceware.js:generateDiceware`. Calls `src/infrastructure/composer/composer-seal-driver.js:ComposerSealDriver`. Calls `src/infrastructure/composer/credential-store.js:CredentialStore`. Calls `src/infrastructure/composer/file-basket-store.js:FileBasketStore`. Calls `src/infrastructure/composer/seal-store.js:SealStore`. Calls `src/infrastructure/packaging/reader-template-packaging.js:ReaderTemplatePackaging`. Imports `src/composer/combined-entropy.js`. Imports `src/composer/file-basket-view.js`. Imports `src/composer/password-field.js`. Imports `src/composer/safe-dial.js`. Uses `mobx-react-lite`

### file-basket-view.tsx

- **Purpose:** declares `FileBasketViewProps` type.
- **Key elements:** `FileBasketView`, `FileBasketViewProps`
- **Relations:** Imports `src/infrastructure/composer/file-basket-store.js`. Uses `mobx-react-lite`, `react`

### password-field.tsx

- **Purpose:** declares `PasswordFieldProps` type.
- **Key elements:** `PasswordField`, `PasswordFieldProps`
- **Relations:** Imports `src/infrastructure/composer/credential-store.js`. Uses `mobx-react-lite`, `react`

### safe-dial.tsx

- **Purpose:** Exports `SafeDial`.
- **Key elements:** `SafeDial`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
