# Self-Sealing Encrypted Attachments — Implementation Roadmap

**Target:** A React/MobX/TypeScript SPA that packs files into a single self-contained HTML file, encrypted under a password + 3-round safe combination. The generated file, opened in any desktop browser, prompts for the same secrets and decrypts/downloads the attachments.

**Platform scope:** Desktop only (Windows / macOS / Linux), Chrome · Firefox · Safari · Edge. Mobile is explicitly out of scope for v1.

**Format version:** `SPK1` — frozen at M1, versioned in the header.

---

## 1. Threat model — read this before changing anything

The generated HTML file _is_ the attacker's copy. Every guard the reader UI enforces — attempt counters, lockouts, delays — is deleted by editing the file or extracting the ciphertext directly.

> **Brute-force resistance = secret entropy × KDF cost. Nothing else.**

Design consequences, all non-negotiable:

| Rule                                                         | Reason                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| No plaintext verifier blob, no "password OK" marker          | Any cheap check becomes a brute-force oracle. The AEAD tag is the only validity check. |
| Filenames/sizes live _inside_ the encrypted zip              | Metadata leakage is leakage.                                                           |
| Wrong password and wrong dial produce the same generic error | No partial-credit signal.                                                              |
| The dial is not a second factor                              | It is ~20 bits of additional password with a nicer input widget. Budget it as such.    |
| Reader-side backoff is UX, not security                      | Label it honestly in code comments and in the UI copy.                                 |

**In scope:** offline brute-force against a captured file; tampering, truncation, and chunk reordering; metadata leakage.

**Out of scope:** compromised endpoint, keylogger, malicious composer build, coercion, side-channel attacks on the browser.

---

## 2. Architecture

Two build outputs from one monorepo. Crypto and domain are shared; UI is deliberately **not** — every kilobyte in the reader is paid on every generated file.

```
packages/
  core-crypto/     pure TS, zero DOM: Argon2 params, KDF, STREAM AEAD, header codec
  core-domain/     Secret, SafeCombination, Argon2Params, Envelope, SealedPackage, Manifest
  core-archive/    fflate zip/unzip, chunk iteration, manifest handling
  worker/          typed crypto-worker protocol (KDF + cipher off the main thread)
apps/
  composer/        React + MobX SPA — the authoring tool
  reader/          reader stub — own Vite entry, own bundle budget
```

### Bounded contexts (light DDD — no ceremony beyond what earns its keep)

- **Credential** — `Password` (NFKC-normalized), `SafeCombination` (value object, 3 rounds, alternating direction, canonical serialization), `Argon2Params`, entropy estimation, weak-combination rejection.
- **Sealing** — `Envelope` aggregate: files → manifest → zip → chunked AEAD stream → `SealedPackage`.
- **Unsealing** — parse header → preflight → derive → decrypt → verify → emit files.
- **Packaging** — template injection and single-file emission. Knows nothing about crypto.

**Layering rule:** the domain is pure and framework-free. MobX stores are thin orchestration plus observable progress. No business logic in stores; no crypto in components.

---

## 3. Cryptographic specification (`SPK1`)

### Secret material

```
canonical = "SPK1\0" || NFKC(password) || "\0" || dial.canonical()
dial.canonical() = "R1:CW:37|R2:CCW:12|R3:CW:88"
```

The dial is **mandatory** and is mixed into the KDF input. It is never verified separately.

### Key derivation

```
Argon2id(canonical, salt = 16B CSPRNG, m, t, p = 1)  ->  32B master
HKDF-SHA256(master, info = "content-key-v1")         ->  32B contentKey
```

`p = 1` is fixed. `file://` disables `SharedArrayBuffer`, so threaded WASM Argon2 is unavailable regardless — and single-lane maximizes memory-hardness per unit of work, which favors the defender.

### Parameter bounds

| Tier                 | m       | t   | p   | ~wall time |
| -------------------- | ------- | --- | --- | ---------- |
| Floor (reject below) | 256 MiB | 3   | 1   | ~0.7 s     |
| Default              | 512 MiB | 3   | 1   | ~1.5 s     |
| Paranoid (opt-in)    | 1 GiB   | 4   | 1   | ~4 s       |

The composer calibrates against the sealing machine but **clamps to `[256 MiB, 1 GiB]`**. The floor prevents a throttled or battery-saver machine from silently producing a weak file. The ceiling is not a performance limit — Chrome and Safari become unreliable allocating a single contiguous buffer beyond ~1 GiB when other tabs are live. Chosen params are written to the header; the header codec rejects out-of-range values on read.

### Payload

```
files -> manifest.json + files -> zip (fflate) -> 1 MiB chunks
per chunk i: AES-256-GCM
  nonce = 4B random prefix || 8B big-endian counter(i)
  AAD   = canonicalHeaderBytes || u64(i) || u8(isFinal)
```

This is the STREAM construction: per-chunk AAD binding blocks truncation, reordering, and chunk splicing across files.

### Header (plaintext, fully authenticated as AAD)

```
magic "SPK1" | version u16 | argon2 m/t/p | salt 16B
| nonce prefix 4B | chunk size u32 | chunk count u32
```

Explicitly absent: password hints, plaintext manifest, verifier blob.

---

## 4. Entropy budget

Three rounds × 100 positions with forced alternating direction = **19.93 bits**. That number is fixed and public; the attacker knows the format.

At 512 MiB / t=3, a well-resourced attacker achieves roughly 10²–10³ guesses/sec — memory bandwidth, not compute, is the bottleneck (a 24 GB GPU holds ~45 concurrent instances). **The dial alone falls in hours.**

| Component                  | Bits                   |
| -------------------------- | ---------------------- |
| Safe combination           | 19.9                   |
| Password (5-word diceware) | 64.6                   |
| **Combined target**        | **≥ 80, ~85 achieved** |

`Proceed` is **gated**, not merely warned, on the combined estimate. The composer ships a diceware generator in the password field. A user typing `hunter2` plus a dial sits at ~40 bits and falls in an afternoon — the UI must make that state unreachable, not just discouraged.

### Weak-combination rejection

Enforced in `core-domain`, shared by composer and reader:

- all three positions equal (`50-50-50`)
- arithmetic runs (`10-20-30`, `90-60-30`)
- any position at `0`
- all positions on multiples of 10 or 25
- date-shaped combinations (`07-04-26`)

This eliminates a few thousand of a million candidates — negligible entropy cost — while deleting exactly the candidates an attacker enumerates first.

---

## 5. Known constraints

- **Size.** Base64 inflates 33%; browsers degrade past a few hundred MB of string. Hard cap 100 MB payload, warn at 50 MB, clear failure above. Encode in chunks — `String.fromCharCode.apply` on a large array blows the stack.
- **Memory.** Argon2 at 512 MiB plus zip plus ciphertext will OOM if held simultaneously. Stream chunk-by-chunk; never hold plaintext and ciphertext copies of the same data.
- **`file://` protocol.** No network, no CDN imports, no `SharedArrayBuffer`, and blob-URL Workers are restricted in some browsers. Verify in M0 — this invalidates the most assumptions.
- **Reader preflight.** Parse the header and attempt the WASM memory allocation _before_ showing the credential form. Fail with "this file needs 1 GiB and your browser refused it — close some tabs," not a crash after the user has typed everything.

---

## 6. Milestones

### M0 — Risk spike (2–3 days)

Not product code. Kills the assumptions that would force a redesign later.

- [ ] Argon2id WASM runs in a worker from a single HTML file loaded over `file://`, in all four browsers
- [ ] **Allocate 1 GiB WASM memory under `file://`** in all four browsers — highest-risk item; if Safari refuses, the ceiling drops to 512 MiB permanently
- [ ] 50 MB payload round-trips end to end
- [ ] `vite-plugin-singlefile` produces a working self-contained output

**Exit:** all four green, or the spec changes now rather than at M5.

### M1 — `core-crypto` + `core-domain`

Pure TS, no UI, no DOM.

- [ ] `Argon2Params` value object with `MIN`/`DEFAULT`/`MAX` and a validating constructor
- [ ] `SafeCombination` value object: canonical serialization + weak-combination validator
- [ ] KDF wrapper, HKDF derivation
- [ ] STREAM AEAD encode/decode
- [ ] Header binary codec, with range rejection on read
- [ ] Known-answer test vectors, committed and frozen
- [ ] Property test: `unseal(seal(x, s), s) === x` over random `x`, `s`
- [ ] Tamper tests: flip one byte in each header field and each chunk → must throw, never silently truncate

### M2 — `core-archive` + `Envelope`

- [ ] Zip/unzip with embedded manifest
- [ ] Duplicate filenames, empty files, Unicode and RTL names, deep paths
- [ ] Chunk iterator over the zip stream

### M3 — Worker layer

- [ ] Typed request/response protocol shared by both apps
- [ ] Transferables for zero-copy chunk handoff
- [ ] Progress events and cancellation

### M4 — Composer UI

- [ ] `CredentialStore` — password, dial state, `combinedEntropyBits` (computed), `sealBlockers` (observable reasons `Proceed` is disabled)
- [ ] `FileBasketStore` — add/remove, size accounting, cap enforcement
- [ ] `SealStore` — explicit state machine: `idle → calibrating → hashing → zipping → encrypting → emitting → done | error`
- [ ] Safe-dial component: drag **and** keyboard operable, full ARIA — must not require a mouse
- [ ] Diceware generator in the password field
- [ ] Live combined-entropy readout

### M5 — Reader stub

- [ ] Own Vite entry; budget **< 80 KB gzipped** excluding WASM
- [ ] Preflight: header parse + memory allocation check before the credential form
- [ ] Same dial component as the composer — a canonicalization mismatch between the two would silently corrupt the secret
- [ ] Unseal → progress → per-file and "download all" CTAs via `Blob` + `createObjectURL`, revoked after use
- [ ] Honest in-file note on what this does and does not protect against

### M6 — Packaging

- [x] Reader template imported as `?raw` at build time
- [x] Payload injected into `<script type="application/octet-stream">` — **not** a JS string literal, which invites escaping bugs
- [x] Build-time assertion: template contains exactly one payload placeholder

### M7 — Hardening

- [ ] Zero key buffers after use
- [ ] Exponential reader-side backoff, commented and labeled as convenience only
- [ ] Generic, non-discriminating failure messages
- [ ] Reproducible builds so the reader stub is independently auditable

### M8 — Test matrix & release

| Axis          | Cases                                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| Browsers      | Chrome, Firefox, Safari, Edge — desktop only                                        |
| Protocol      | `file://` and `https://`                                                            |
| Payload sizes | 1 KB · 10 MB · 100 MB · one file over cap                                           |
| Failure modes | wrong password · wrong dial · corrupted byte · truncated file · header out of range |
| Stress        | 1 GiB-param file opened on an 8 GB machine with 20 tabs open                        |

---

## 7. Open items for later versions

- Public-key mode (seal for a recipient without a shared secret) — would remove the entropy problem entirely, at the cost of key distribution.
- Argon2 parameter negotiation if mobile support is ever added; the current floor is desktop-calibrated and would need to drop.
- Detached-payload mode for files above the 100 MB cap.
