# M0 — Risk spike results

**Goal:** validate, before any product code is written, that the assumptions
under `file://` (no network, no `SharedArrayBuffer`, no module fetches) do
not force a redesign later.

**Outcome:** four self-contained HTML probes built by `vite-plugin-singlefile`
(or the spike's compatible custom plugin suite) are produced. Each is a
**single file** with no external assets, no `<script src>`, no `<link
href>`. The probes' structural integrity is verified by `npm run test:all`
in the spike; the actual browser runs are a manual matrix below.

---

## Probes

| # | Folder                       | Goal                                                                                   | Single-file size |
| - | ---------------------------- | -------------------------------------------------------------------------------------- | ---------------- |
| 1 | `argon2-worker/dist/`        | Argon2id WASM runs in a Worker from a single HTML file loaded over `file://`           | ~33 KiB          |
| 2 | `memory-probe/dist/`         | Allocate 1 GiB WASM memory under `file://` (highest-risk item)                        | ~5 KiB           |
| 3 | `payload-roundtrip/dist/`    | 50 MiB payload round-trip inside a Worker                                            | ~22 KiB          |
| 4 | `singlefile-build/dist/`     | Single-file build (from the spike's plugin suite) runs all three probes back-to-back  | ~47 KiB          |

To build all four:

```bash
cd spikes/m0
npm install            # only the first time
npm run build:all
```

Each `dist/index.html` is fully self-contained: open it in a browser over
`file://`, click the button, and read the result.

---

## Manual browser matrix

For each browser × probe, open `dist/index.html` from disk and click the
single button on the page. Mark the cell as **OK** (green), **FAIL**
(red), or **N/A** (browser not installed).

| Browser           | Chrome | Firefox | Safari | Edge |
| ----------------- | :----: | :-----: | :----: | :--: |
| Argon2 in Worker  |        |         |        |      |
| 1 GiB WASM alloc  |        |         |        |      |
| 50 MiB round-trip |        |         |        |      |
| Combined probe    |        |         |        |      |

**Pass criteria for M0 exit:**

- Argon2: a 32-byte hash is produced; worker ms is in the ballpark of 700 ms
  at 256 MiB / t=3 on the sealing machine.
- 1 GiB: the allocated byte count matches `1073741824`; no exception.
- 50 MiB: `sizeBytes === 52428800`; SHA-256 hash is stable across runs
  (deterministic content).
- Combined: all three steps green.

**Spec change trigger:** any FAIL in the 1 GiB row forces the ceiling
down to 512 MiB permanently. Safari historically refuses 1 GiB on
low-RAM machines, so prefer testing on a desktop with ≥ 16 GB RAM.

---

## What M0 has *not* verified

- Actual browser-version behaviour. The matrix above is human work.
- Cross-browser timing budgets. Use the recorded `worker ms` figures as
  baseline; if the worst browser is more than 2× the fastest, KDF
  cost is at risk of going from "UX delay" to "UX bug".
- Memory pressure on a real machine. Close 20 tabs and try again.
- `crypto.subtle` availability — none of the probes touch it; that is
  M1's problem.

---

## Build notes (for the M1+ author)

- The spike uses a **custom plugin suite** (`spikes/m0/build.ts`) in
  place of `vite-plugin-singlefile`. The reason is documented inline in
  that file: vite-plugin-singlefile does not handle worker chunks (it
  only inlines `<script src>` and `<link href>`), and the worker must
  be inlined as a `window.__W_*_SRC__` global for the `file://` Worker
  constructor to find it via a `URL.createObjectURL(blob)` blob URL.
- For M1+ when the project is not loaded from `file://`, the
  `__W_*_SRC__` indirection is unnecessary and the worker can be a
  real `new Worker(new URL('./worker.ts', import.meta.url))`. Keep
  the option open by having the worker entry live in a separate
  `worker.ts` file — the current probes already do.
- `hash-wasm` ships its WASM as base64 inside its JS bundle, so it
  inlines cleanly. There is no second network request to worry about.

---

## File map

```
spikes/m0/
├── package.json                      npm scripts; installs vite, hash-wasm,
│                                     jsdom, tsx, types
├── tsconfig.json                     strict TS, lib DOM + WebWorker
├── vite-env.d.ts                     ?raw / ?worker / window global decls
├── build.ts                          shared build helper (worker inlining,
│                                     JS/CSS inlining, dist cleanup)
├── argon2-worker/                    Probe 1
│   ├── index.html
│   ├── src/main.ts                   main-thread entry; reads window.__ARGON2…
│   ├── src/argon2.worker.ts          worker source (hash-wasm argon2id)
│   └── vite.config.ts
├── memory-probe/                     Probe 2
│   ├── index.html
│   ├── src/main.ts
│   ├── src/memory.worker.ts          worker source (1 GiB wasm.Memory)
│   └── vite.config.ts
├── payload-roundtrip/                Probe 3
│   ├── index.html
│   ├── src/main.ts
│   ├── src/payload.worker.ts         worker source (50 MiB + sha256)
│   └── vite.config.ts
├── singlefile-build/                 Probe 4
│   ├── index.html
│   ├── src/main.ts
│   ├── src/combined.worker.ts        worker source (all three steps)
│   └── vite.config.ts
├── scripts/
│   ├── smoke.ts                      structural checks (single file, worker
│   │                                 source embedded, no external assets)
│   └── browser-smoke.ts              jsdom-loads-HTML checks (worker source
│                                     on window, inline main script parses)
└── docs/
    └── M0-results.md                 ← you are here
```