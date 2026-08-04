# Release checklist — manual QA

Run this before tagging a release, in addition to `./scripts/verify.sh` and
`npm run test:e2e:browsers`. Everything here depends on real OS behavior
(memory pressure, an actual Safari binary, actual Edge) that automation
either can't reach or can't reach honestly.

## Why this exists, not more automation

- `npm run test:e2e:browsers` (Playwright) covers Chromium, Firefox, and
  WebKit — real Safari and real Edge do not exist as headless Linux/CI
  targets. WebKit and Chromium are close proxies for Safari and Edge
  respectively, but "close" is not "is."
- The 1 GiB Argon2 stress case depends on genuine system memory pressure
  (other tabs, other apps) that a CI sandbox can't reproduce meaningfully —
  simulating it would just be asserting the mock behaves as mocked.

## 1. Real Safari, real Edge

Repeat the composer → reader round trip from `e2e-playwright/*.spec.ts` by
hand:

- [ ] **Safari** (macOS), both `file://` (open `dist-composer/composer.html`
      directly) and served over `http(s)://`
- [ ] **Edge** (Windows or macOS), same two protocols

For each: add a small file, set a strong password + a valid dial, seal,
open the resulting `envelope.html`, unseal with the same credential, and
confirm the downloaded file matches byte-for-byte.

## 2. 1 GiB stress case

On a machine with ~8 GB RAM:

- [ ] Open ~20 unrelated tabs (a mix of heavy sites is fine — the point is
      background memory pressure)
- [ ] In the composer, force the **paranoid** Argon2 preset (1 GiB / t=4) if
      calibration doesn't pick it automatically
- [ ] Seal a small file. Expect one of two honest outcomes: - it succeeds (give it time — 1 GiB Argon2 is slow), or - the calibration probe or the reader's preflight check refuses
      cleanly with "this file needs 1 GiB and your browser refused it —
      close some tabs," per the roadmap's UX requirement — **not** a
      crash, a hang, or a silently-truncated file.
- [ ] Repeat while _opening_ a 1 GiB-param sealed file under the same tab
      pressure (preflight is supposed to catch this before the credential
      form even appears)

## 3. Sanity spot-checks not worth scripting

- [ ] A payload right at the 100 MB cap seals and opens correctly (not just
      "one byte over" rejects, which `src/m8-test-matrix.int.test.ts`
      already covers)
- [ ] The reader's in-file security note is still accurate and matches
      current scope (§1 of the roadmap) — re-read it after any threat-model
      change
- [ ] `npm run build` output is byte-identical across two clean builds
      (reproducibility — automated in
      `src/reader-build-reproducible.int.test.ts`, but worth eyeballing the
      diff once before a release if the toolchain version changed)

## Sign-off

Record the browser/OS versions actually tested (not just "Safari" — the
version, since WebKit's WASM/memory behavior has moved between releases)
and the outcome of the stress case before tagging.
