# Product Facts

> Single source of truth for all downstream marketing skills. No promotional material may claim more
> than this document supports.

## Verified facts

Every fact traced to a repository file, the README, or the user. The `source:` field is restricted to
`<repo-relative path>` | `README` | `user`.

- Package name is `envelope` — source: `package.json`
- License declared in `package.json` is ISC — source: `package.json`
- Written in TypeScript with strict mode, `module: "NodeNext"`, and `verbatimModuleSyntax: true` — source: `tsconfig.json`
- React 19, MobX, and `vite-plugin-singlefile` are used to build the apps — source: `package.json`
- Runs an 8-stage local quality pipeline (`tsc → eslint → coverage guard → dead-code → unit → integration → e2e → security`) — source: `scripts/verify.sh`
- Cross-browser end-to-end tests target Chromium, Firefox, and WebKit via Playwright — source: `playwright.config.ts`
- The DDD layering (`domain` → `application` → `infrastructure`) is enforced by ESLint `import/no-restricted-paths` — source: `eslint.config.mjs`
- The product is described as "self-sealing encrypted attachments": the composer turns a chosen file into a single `envelope.html` that contains both the encrypted payload and the decryption reader code — source: `README.md`
- Two SPA entrypoints exist: a Composer (authoring tool, `src/composer.tsx`) and a Reader (embedded into every sealed file, `src/reader.tsx`) — source: `src/composer.tsx`, `src/reader.tsx`, `README.md`
- The composer is configured to build as a single self-contained HTML file via Vite + `vite-plugin-singlefile` — source: `vite.config.ts`
- The build emits `dist-composer/composer.html` (authoring tool) and `dist-reader/reader.html` (reader shell embedded into sealed envelopes) — source: `README.md`, `AGENTS.md`
- The sealed envelope can be opened by a recipient directly in a browser, including over `file://`, with no server or install step — source: `README.md`
- A sealed envelope is described in the README as self-contained and openable offline — source: `README.md`
- Encryption is client-side: the README states client-side encryption with Argon2 key derivation and authenticated encryption, calibrated to the opening device's available memory — source: `README.md`
- Key derivation uses Argon2id via `hash-wasm`; the 32-byte master key is then expanded to a 32-byte content key via HKDF-SHA-256 — source: `src/infrastructure/crypto/kdf.ts`
- The streaming AEAD is AES-GCM-256 with a 128-bit auth tag, applied in chunks; the additional authenticated data binds each chunk to a canonical header, an 8-byte counter, and a final-chunk flag — source: `src/infrastructure/crypto/stream-aead.ts`
- The on-disk sealed-package header is a fixed 43-byte `SPK1` frame (magic + version + Argon2 params + 16-byte salt + 4-byte nonce prefix + chunk size + chunk count) — source: `src/infrastructure/crypto/header-codec.ts`
- The default chunk size is 1 MiB — source: `src/infrastructure/crypto/header-codec.ts`
- Argon2 parallelism in the sealed header is constrained to `1` — source: `src/infrastructure/crypto/header-codec.ts`
- Before unsealing, the reader runs a WASM-memory preflight that refuses cleanly when the browser cannot allocate the requested Argon2 memory; the use case surfaces this as `ReaderMemoryError` — source: `src/application/reader/unseal-package.ts`
- A wrong password and a wrong dial produce the same generic authentication failure (no partial-credit oracle) — source: `src/domain/credential/safe-combination.ts`
- The credential is a password plus a three-number "safe dial" combination; positions are integers in `[0, 99]` and the dial is forced to alternate direction (CW, CCW, CW) — source: `src/domain/credential/safe-combination.ts`, `README.md`
- Weak dial combinations (zeros, all-equal, arithmetic runs, all multiples of 10/25, date-shaped `M/D/YY`) are rejected at authoring time — source: `src/domain/composer/credential-validation.ts`
- The dial contributes a fixed 19.93 bits; the combined password + dial entropy must clear an 80-bit threshold before the Seal action is enabled — source: `src/domain/composer/seal-blocker.ts`
- The composer ships a diceware passphrase generator with a 5-word default and a 256-word demo list; the file flags the list as a swappable one-liner for a production 7-7-7 list — source: `src/domain/composer/diceware.ts`
- A "calibrate Argon2 parameters" gate refuses sealing until Argon2 params are valid in the documented range (256 MiB / 3 iterations up to 1 GiB / 4 iterations) — source: `src/domain/composer/seal-blocker.ts`
- The total file-basket size is capped at 100 MiB (`ARCHIVE_MAX_ENTRY_BYTES`) — source: `src/domain/composer/file-basket.ts`
- The unseal pipeline is wired through a small composition root (`ReaderFactory`) that builds `ReaderStore` with `BrowserMemoryPreflight`, `BrowserReaderCrypto`, and an `fflate`-backed archive adapter — source: `src/infrastructure/reader/reader-factory.ts`
- The composer stores data only in memory; no account, server, or backend is referenced anywhere in `src/` — source: `src/` (no auth or backend module present)
- The release checklist adds manual QA for real Safari and real Edge (Playwright uses WebKit and Chromium as proxies) and a 1 GiB Argon2 stress case that requires real OS memory pressure — source: `docs/release-checklist.md`
- The handbook (`AGENTS.md`) describes `dist-composer/composer.html` as "one HTML file with React, MobX, and the composer baked in, no external assets" — source: `AGENTS.md`
- Production URL is `https://xenvelope.surge.sh` (composer hosted there; reader is embedded into every sealed envelope the composer produces) — source: user
- Primary goal is a portfolio / personal showcase — source: user
- Open-source status is a public repository, ISC license — source: user
- There are no shipped or planned features beyond what is currently in the source tree — source: user

## Repository evidence

Concrete file paths in this repository that back the Verified facts.

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `vite.config.ts`
- `vite.reader.config.ts`
- `playwright.config.ts`
- `scripts/verify.sh`
- `README.md`
- `AGENTS.md`
- `docs/release-checklist.md`
- `src/composer.tsx`
- `src/reader.tsx`
- `src/composer/composer-app.tsx`
- `src/reader/reader-app.tsx`
- `src/domain/credential/argon2-params.ts`
- `src/domain/credential/safe-combination.ts`
- `src/domain/credential/secret.ts`
- `src/domain/composer/credential-validation.ts`
- `src/domain/composer/diceware.ts`
- `src/domain/composer/entropy.ts`
- `src/domain/composer/file-basket.ts`
- `src/domain/composer/seal-blocker.ts`
- `src/domain/archive/archive.ts`
- `src/domain/archive/manifest.ts`
- `src/domain/packaging/package-template.ts`
- `src/domain/reader/sealed-package.ts`
- `src/domain/reader/types.ts`
- `src/application/envelope/envelope.ts`
- `src/application/composer/prepare-seal.ts`
- `src/application/reader/unseal-package.ts`
- `src/application/ports/archive-ports.ts`
- `src/application/ports/packaging-ports.ts`
- `src/application/ports/worker-ports.ts`
- `src/infrastructure/crypto/header-codec.ts`
- `src/infrastructure/crypto/kdf.ts`
- `src/infrastructure/crypto/stream-aead.ts`
- `src/infrastructure/archive/fflate-adapter.ts`
- `src/infrastructure/composer/composer-seal-driver.ts`
- `src/infrastructure/composer/credential-store.ts`
- `src/infrastructure/composer/file-basket-store.ts`
- `src/infrastructure/composer/seal-store.ts`
- `src/infrastructure/composer/argon2-calibration-adapter.ts`
- `src/infrastructure/composer/wasm-capabilities-adapter.ts`
- `src/infrastructure/packaging/reader-template-packaging.ts`
- `src/infrastructure/packaging/reader-template.ts`
- `src/infrastructure/reader/browser-memory-preflight.ts`
- `src/infrastructure/reader/browser-reader-crypto.ts`
- `src/infrastructure/reader/reader-factory.ts`
- `src/infrastructure/reader/reader-store.ts`
- `src/infrastructure/worker/worker-host.ts`
- `src/infrastructure/worker/worker-client.ts`
- `src/infrastructure/worker/worker-protocol.ts`
- `src/infrastructure/worker/post-message-bus.ts`
- `src/infrastructure/worker/in-process-bus.ts`
- `e2e-playwright/` (Playwright spec suites)
- `src/composer.e2e.test.ts`
- `src/reader.e2e.test.ts`
- `src/composer-build.int.test.ts`
- `src/reader-build.int.test.ts`
- `src/reader-build-reproducible.int.test.ts`
- `src/m8-test-matrix.int.test.ts`

## User-provided facts

Only the four non-derivable categories.

- Production URL: `https://xenvelope.surge.sh` (composer; the reader is embedded into every sealed envelope) — source: user
- Primary goal: portfolio / personal showcase — source: user
- Open-source status: public repository, ISC license — source: user
- Features not visible in the repository: none — every feature the user plans to market is already in the source tree today — source: user

## Unknown

Gaps recorded as open. Never invent an answer here.

- Number of active users (the surge.sh deployment is a static site; no analytics or auth module is wired into the source tree) — source: n/a
- Performance benchmarks (seal time, unseal time, Argon2 calibration behaviour across devices) — source: n/a
- Exact automated browser support matrix: Playwright runs Chromium / Firefox / WebKit; real Safari and real Edge are covered only by manual QA in `docs/release-checklist.md` — source: `docs/release-checklist.md`
- Reader bundle size in the final release build (the `AGENTS.md` mentions a "≈104 KB gzipped" size for `dist-composer/composer.html`; the reader bundle budget is referenced in a code comment but not measured) — source: `AGENTS.md`, `src/domain/composer/diceware.ts`
- The intended production 7-7-7 EFF diceware word list is not shipped — the current file embeds a 256-word demo list and flags it as a one-liner swap — source: `src/domain/composer/diceware.ts`
- Whether the `https://xenvelope.surge.sh` host is actively maintained as the canonical deployment at any given moment — source: n/a

## Forbidden assumptions

Never claim the following without explicit evidence. Un-evidenced occurrences are parked here, not in
Verified facts.

- fastest
- most secure
- better than competitors
- privacy-preserving
