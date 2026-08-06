# CLAUDE.md — archive

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 6 source file(s) in `src/domain/archive`.

## File Map

### archive-path.ts

- **Purpose:** Defines `ArchivePathTooDeepError`, `DuplicateArchivePathError`, `InvalidArchivePathError` classes; provides `normalizeArchivePath` function; declares `NormalizedArchivePath` type.
- **Key elements:** `ARCHIVE_MAX_ENTRY_BYTES`, `ARCHIVE_MAX_PATH_BYTES`, `ARCHIVE_MAX_PATH_DEPTH`, `ArchivePathTooDeepError`, `DuplicateArchivePathError`, `InvalidArchivePathError`, `normalizeArchivePath`, `NormalizedArchivePath`

### archive-path.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/archive/archive-path.js:DuplicateArchivePathError,normalizeArchivePath`. Uses `vitest`

### archive.ts

- **Purpose:** Defines `Archive`, `InvalidArchiveError` classes; declares `ArchiveEntry`, `ArchiveEntryInput` types.
- **Key elements:** `Archive`, `ARCHIVE_MAX_ENTRY_BYTES`, `ARCHIVE_MAX_PATH_BYTES`, `ARCHIVE_MAX_PATH_DEPTH`, `ArchiveEntry`, `ArchiveEntryInput`, `ArchivePathTooDeepError`, `DuplicateArchivePathError`, `InvalidArchiveError`, `InvalidArchivePathError`, `normalizeArchivePath`, `type NormalizedArchivePath`
- **Relations:** Calls `src/domain/archive/archive-path.js:DuplicateArchivePathError,normalizeArchivePath`

### archive.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Imports `src/domain/archive/archive.js`. Uses `vitest`

### manifest.ts

- **Purpose:** Defines `InvalidManifestError` class; provides `createManifest`, `createManifestEntry`, `parseManifest`, `serializeManifest` functions; declares `Manifest`, `ManifestEntry` types.
- **Key elements:** `createManifest`, `createManifestEntry`, `InvalidManifestError`, `Manifest`, `MANIFEST_ENTRY_NAME`, `ManifestEntry`, `parseManifest`, `serializeManifest`

### manifest.unit.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/archive/manifest.js:createManifest,createManifestEntry,parseManifest,serializeManifest`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
