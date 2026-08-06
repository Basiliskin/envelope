# CLAUDE.md — ports

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 4 source file(s) in `src/application/ports`.

## File Map

### archive-ports.ts

- **Purpose:** declares `ArchiveReaderPort`, `ArchiveWriteEvent`, `ArchiveWriterPort` types.
- **Key elements:** `ArchiveReaderPort`, `ArchiveWriteEvent`, `ArchiveWriterPort`
- **Relations:** Imports `src/domain/archive/archive.js`. Imports `src/domain/archive/manifest.js`

### packaging-ports.ts

- **Purpose:** declares `PackagingPort` type.
- **Key elements:** `PackagingPort`

### packaging-ports.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Imports `src/application/ports/packaging-ports.js`. Uses `vitest`

### worker-ports.ts

- **Purpose:** declares `CryptoWorkerPort`, `SealWorkerInput`, `SealWorkerResult`, `UnsealWorkerInput`, `UnsealWorkerResult`, `WorkerErrorKind`, `WorkerPhase`, `WorkerProgress`, `WorkerSealEvent`, `WorkerUnsealEvent` types.
- **Key elements:** `CryptoWorkerPort`, `SealWorkerInput`, `SealWorkerResult`, `UnsealWorkerInput`, `UnsealWorkerResult`, `WorkerErrorKind`, `WorkerPhase`, `WorkerProgress`, `WorkerSealEvent`, `WorkerUnsealEvent`
- **Relations:** Imports `src/domain/credential/argon2-params.js`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
