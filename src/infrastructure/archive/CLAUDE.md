# CLAUDE.md — archive

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 2 source file(s) in `src/infrastructure/archive`.

## File Map

### fflate-adapter.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/application/envelope/envelope.js:Envelope`. Calls `src/domain/archive/manifest.js:createManifest,createManifestEntry,serializeManifest`. Calls `src/infrastructure/archive/fflate-adapter.js:FflateArchiveReader,FflateArchiveWriter,FflateReaderArchive`. Uses `fflate`, `vitest`

### fflate-adapter.ts

- **Purpose:** Defines `FflateArchiveReader`, `FflateArchiveWriter`, `FflateReaderArchive` classes.
- **Key elements:** `FflateArchiveReader`, `FflateArchiveWriter`, `FflateReaderArchive`
- **Relations:** Calls `src/domain/archive/manifest.js:parseManifest,serializeManifest`. Imports `src/application/ports/archive-ports.js`. Imports `src/application/reader/reader-ports.js`. Imports `src/domain/archive/archive.js`. Imports `src/domain/reader/types.js`. Uses `fflate`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
