# CLAUDE.md — envelope

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 2 source file(s) in `src/application/envelope`.

## File Map

### envelope.ts

- **Purpose:** Defines `Envelope` class; declares `PlaintextChunk`, `SealInput` types.
- **Key elements:** `Envelope`, `PlaintextChunk`, `SealInput`
- **Relations:** Calls `src/domain/archive/manifest.js:createManifest,createManifestEntry`. Imports `src/application/ports/archive-ports.js`. Imports `src/domain/archive/archive.js`

### envelope.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/application/envelope/envelope.js:Envelope`. Calls `src/domain/archive/manifest.js:serializeManifest`. Imports `src/application/ports/archive-ports.js`. Imports `src/domain/archive/archive.js`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
