# CLAUDE.md — m0

**Last updated:** 2026-08-04
**Mode:** Flat

## Overview
Contains 2 source file(s) in `spikes/m0`.

## File Map

### build.ts
- **Purpose:** provides `createSpikeConfig` function; declares `SpikeBuildOptions` type.
- **Key elements:** `createSpikeConfig`, `SpikeBuildOptions`
- **Relations:** Uses `node:path`, `node:url`, `vite`

### vite-env.d.ts
- **Purpose:** Exports `source`, `WorkerConstructor`.
- **Key elements:** `source`, `WorkerConstructor`

## Subfolders
- `argon2-worker/` → see [CLAUDE.md](./argon2-worker/CLAUDE.md)
- `memory-probe/` → see [CLAUDE.md](./memory-probe/CLAUDE.md)
- `payload-roundtrip/` → see [CLAUDE.md](./payload-roundtrip/CLAUDE.md)
- `scripts/` → see [CLAUDE.md](./scripts/CLAUDE.md)
- `singlefile-build/` → see [CLAUDE.md](./singlefile-build/CLAUDE.md)

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
