# envelope

Self-sealing encrypted attachments. **Envelope** turns any file into a single
password-protected `envelope.html` — a standalone HTML file that carries both
the encrypted payload and the code needed to decrypt it. Recipients open it
in a browser (even over `file://`, no server or install needed), enter the
password and dial combination, and get their file back byte-for-byte.

## How it works

- **Composer** (`composer.html`) — the authoring tool. Pick a file, choose a
  password (or generate a diceware passphrase), set a three-number "safe
  dial" (1–99), and seal. Sealing only unlocks once combined entropy clears
  an 80-bit threshold.
- **Reader** — embedded inside every sealed `envelope.html` the composer
  produces. No separate app is needed to open a sealed file; the decryption
  UI travels with the payload.
- Encryption is client-side (Argon2 key derivation + authenticated
  encryption), calibrated to the opening device's available memory, with a
  preflight check that refuses cleanly rather than hanging on constrained
  browsers.

## Quick start

```bash
npm install
npm run build
```

This produces:

- `dist-composer/composer.html` — open directly in a browser to seal files
- `dist-reader/reader.html` — the reader shell embedded into sealed envelopes

Seal something: open `dist-composer/composer.html`, add a file, set a
password and dial, click **Seal envelope**, then **Download sealed
envelope**. Open the resulting `envelope.html` to unseal it with the same
credentials.

## Development

```bash
npm run typecheck        # tsc --noEmit
npm run verify            # full quality pipeline (typecheck → lint → tests → security)
npm run verify:fast       # pre-commit subset
npm run test:unit         # unit tests
npm run test:int          # integration tests
npm run test:e2e:browsers # Playwright, cross-browser
```

See `AGENTS.md` for the full architecture (DDD layering: `domain` →
`application` → `infrastructure`), pipeline stage breakdown, and conventions
for where new code should live. See `docs/plans/` for the implementation
roadmap and `docs/release-checklist.md` for manual QA steps that precede a
release.

## Project layout

```
src/
  domain/          pure business rules (credential, packaging, archive, ...)
  application/      use cases / orchestration, split by feature (composer, reader, envelope)
  infrastructure/   adapters: crypto, archive, packaging, worker
  composer/         composer app entrypoint
  reader/           reader app entrypoint
  shared/           cross-cutting utilities
```

## Security

Sealed envelopes are self-contained and can be opened offline. See the
in-file security note inside the reader UI for current threat-model scope,
and `docs/plans/` for the full design rationale.
