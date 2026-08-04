# AGENTS.md

Working notes for AI agents in the `envelope` repository.

This file documents what an agent needs to know that is **not** self-evident
from opening a single source file. If a piece of information is in the code
in front of you, it is intentionally omitted here.

## Project at a glance

- **Name:** `envelope` (package.json:2)
- **Language:** TypeScript on Node.js, strict mode
- **Module system:** `NodeNext` (ESM-style imports + CommonJS package type)
- **Purpose (observed):** This is a **DDD-layered TypeScript scaffold** wired
  to a deterministic quality pipeline (`tsc → eslint → tests → dead-code →
  security`). The source tree currently contains only the empty layer
  directories `src/domain/`, `src/application/`, `src/infrastructure/`. New
  code lives under `src/`; pipeline/tooling lives at the repo root and under
  `.claude/`, `scripts/`, `eslint.config.mjs`, `tsconfig.json`, `.testguard.json`.
- **Type:** `"commonjs"` in package.json, but `tsconfig.json` uses
  `module: "NodeNext"` — **follow what tsconfig says, not the package type**,
  for import/export style. `verbatimModuleSyntax: true` is on, so type-only
  imports **must** use `import type` (the eslint rule
  `@typescript-eslint/consistent-type-imports` enforces `separate-type-imports`).

## Essential commands

All commands are run from the repo root.

| Task | Command |
| --- | --- |
| Type-check only | `npm run typecheck` (== `npx tsc --noEmit`) |
| Full quality pipeline | `npm run verify` (== `./scripts/verify.sh`) |
| Pre-commit subset (stages 1–5) | `npm run verify:fast` |
| Unit tests | `npm run test:unit` |
| Integration tests | `npm run test:int` |
| Test-coverage guard (changed files) | `npm run check:tests` |
| Dead-export gate, whole `src/` | `npm run check:dead-code` |
| Install git hooks (idempotent) | `./scripts/install-hooks.sh` |
| Remove git hooks | `./scripts/install-hooks.sh --uninstall` |
| List pipeline stages | `./scripts/verify.sh --list` |
| Resume pipeline from stage N | `./scripts/verify.sh --from N` |

`scripts/verify.sh` runs **eight gates** in order, stopping at the first red
(`scripts/verify.sh:12-22`):

1. TypeScript compile — `npx tsc --noEmit`
2. ESLint — `npx eslint . --max-warnings 0`
3. Tests: coverage guard — `node .claude/hooks/check-tests.mjs --changed`
4. Dead-code gate — `./scripts/block-dead-code.sh --all`
5. Unit tests — `vitest run 'src/**/*.unit.test.ts'`
6. Integration tests — `vitest run 'src/**/*.int.test.ts'` (sequential)
7. E2E — `vitest run 'src/**/*.e2e.test.ts'`
8. Security: deps — `npm audit --audit-level=high`
9. Security: secrets — `gitleaks detect`

`--fast` truncates to stages 1–4 (suitable for pre-commit).

## Architecture — the three layers

The DDD layering is enforced by ESLint's `import/no-restricted-paths`
(`eslint.config.mjs:78-87`). **You will get a lint error if you violate any
of these arrows:**

```
   ┌─────────────────┐
   │   src/domain    │  ← pure business rules, no I/O
   └────────┬────────┘
            │ (domain depends on nothing)
            ▼
   ┌─────────────────┐
   │ src/application │  ← use cases / orchestration
   └────────┬────────┘
            │ (application may depend on domain)
            ▼
   ┌─────────────────┐
   │src/infrastructure│ ← adapters: DB, HTTP, fs, vendor SDKs
   └─────────────────┘
```

Banned cross-layer imports (see `eslint.config.mjs:81-86`):

- `src/domain` → `src/application` ❌
- `src/domain` → `src/infrastructure` ❌
- `src/application` → `src/infrastructure` ❌

Allowed directions: `domain ← application ← infrastructure`. Domain and
application depend on each other only downward; infrastructure depends on
both.

### Where does code go?

| If it… | Put it in |
| --- | --- |
| Defines an entity, value object, domain error, or pure function with no I/O | `src/domain/` |
| Orchestrates a use case, accepts a port (interface) for external dependencies, and is testable with in-memory fakes | `src/application/` |
| Implements a port against a concrete technology (Postgres, OpenAI SDK, filesystem, HTTP client) | `src/infrastructure/` |
| Is a CLI entrypoint or top-level wiring root | `src/cli.ts` or `src/main.ts` |

## Hard rules (enforced by eslint)

From `eslint.config.mjs`:

- **No `any`**: `@typescript-eslint/no-explicit-any: error` (`eslint.config.mjs:66`).
- **No non-null assertions (`!`)**: `@typescript-eslint/no-non-null-assertion: error` (`:67`).
- **No unsafe JSON parsing**: `JSON.parse(x) as <T>` and
  `JSON.parse(x) satisfies <T>` are banned by `no-restricted-syntax`
  (`:99-113`). The allowed pattern is
  `JSON.parse(x) → unknown → schema.parse(x)` (e.g. zod). Tests and
  infrastructure files are exempt from the SDK ban but the JSON rule still
  applies everywhere.
- **No SDK imports outside `src/infrastructure/`**: the default
  `no-restricted-imports` rule blocks `openai`, `@anthropic-ai/sdk`, `pg`,
  `node:fs`, `node:fs/promises`, `ai`, `@ai-sdk/*` (`:20-31, 90-93`).
  Infrastructure overrides the rule for its own files (`:120-123`); tests
  override it for `**/*.test.ts` (`:117-119`).
- **Type-only imports must be explicit**: `verbatimModuleSyntax: true` +
  `consistent-type-imports: separate-type-imports`. Use
  `import type { Foo } from '...'`, not `import { type Foo } from '...'`.
- **Unused locals/parameters**: tsc strict flags catch them
  (`tsconfig.json:8-9`). Prefix intentionally unused symbols with `_` — the
  eslint config allows `_` as the ignore pattern (`:62-65`).

## tsconfig gotchas

`tsconfig.json` is intentionally strict. These are the flags that bite most
often:

- `strict: true` (default set).
- `noUncheckedIndexedAccess: true` — `arr[i]` and `obj[key]` return `T | undefined`. You **must** narrow or guard.
- `exactOptionalPropertyTypes: true` — `{ x?: string }` does **not** accept `{ x: undefined }`. Pass the property or omit it entirely.
- `noImplicitOverride: true` — `override` keyword required when extending class members.
- `noFallthroughCasesInSwitch: true` — every `case` must `break`/`return`/`throw`.
- `noUnusedLocals` + `noUnusedParameters` — see Hard rules.
- `verbatimModuleSyntax: true` — see Hard rules.
- `module: "NodeNext"` + `moduleResolution: "NodeNext"` — relative imports must include the `.ts`/`.js` extension when targeting ESM; with `verbatimModuleSyntax` it is easiest to keep relative paths extensionless where the resolver allows it. Test in `npm run typecheck` early.

## Testing

### Test file naming (`.testguard.json`)

The coverage guard maps a source file to a required test file via the
`levels[]` rules:

| Source path | Required test | Level |
| --- | --- | --- |
| `src/domain/**` | `<base>.unit.test.ts` (sibling or `tests/<base>.unit.test.ts`) | unit |
| `src/application/**` | `<base>.unit.test.ts` | unit |
| `src/infrastructure/**` | `<base>.int.test.ts` | integration |
| `src/cli.ts`, `src/main.ts` | `<base>.e2e.test.ts` | e2e |
| Anything else | `<base>.unit.test.ts` | unit |

`testLocations` (`.testguard.json:9`) allows tests in either `{dir}/{base}{suffix}`
(sibling) or `tests/{base}{suffix}`.

`ignore` (`.testguard.json:10`) exempts these patterns from requiring tests:
`.d.ts`, `.test.ts`, `/types.ts`, `/ports.ts`, `/index.ts`. So **barrel
re-exports and port/type files don't need their own test file**.

`requireSymbolMentions: true` (`.testguard.json:11`) — every exported
symbol from a non-exempt file must be **mentioned by name** in at least one
test. A test that imports the file but never references a particular export
won't satisfy the guard for that export. Verify by running
`npm run check:tests`.

### What each test level means (from `.claude/skills/SKILL.md`)

- **Unit** (`src/**/*.unit.test.ts`) — pure domain and application logic.
  No I/O. All ports must be in-memory fakes. Should run in under 10s.
  Target ≥ 90% line+branch coverage for `domain/` + `application/`.
- **Integration** (`src/**/*.int.test.ts`) — adapters in `infrastructure/`
  with real dependencies (testcontainers, real DB, etc.). Run sequentially
  (`--fileParallelism=false`) because shared state.
- **E2E** (`src/**/*.e2e.test.ts`) — `src/cli.ts` or `src/main.ts` entry
  points through the full composition root.

### Test-quality traps to avoid

From the unit-tests-gate skill (`.claude/skills/SKILL.md`):

- Don't "fix" a failing test with `it.skip`, `--passWithNoTests`, weakening
  assertions to `toBeTruthy()`, or extending timeouts. Those hide bugs.
- Don't bind tests to implementation details (call order, private members,
  exact timestamps) — assert on observable behaviour.
- Flakiness almost always comes from `Date.now()`, `Math.random()`, real
  timers, shared state, or test order. Try
  `npx vitest run --sequence.shuffle` to confirm.
- Coverage percent is not the goal. Every export must be exercised by at
  least one test, and every error branch must have a test.

### Vitest invocation quirks

- Unit/integration/e2e are split into **separate npm scripts** with
  different glob patterns — do **not** run `npx vitest` with no args and
  expect it to behave like `npm test` (the bare `npm test` script is a
  placeholder that exits with `"Error: no test specified"` —
  `package.json:7`).
- Integration tests run with `--fileParallelism=false` (`package.json:12`).
- All three patterns are run with `--passWithNoTests` so the pipeline is
  green even before the first test exists. **Don't rely on that to claim
  coverage** — the test-coverage guard (`.testguard.json`) is the real
  enforcement.

## Hooks and gates (Claude Code)

`.claude/settings.json` wires three hook chains:

- **PreToolUse on Read/Edit/Write** → `protect-secrets.sh` (`:9`).
  Refuses to read/edit/write files matching secret patterns (likely
  `.env`, `*.pem`, credential files). The hook script lives at
  `.claude/hooks/protect-secrets.sh`.
- **PostToolUse on Edit|Write when `Edit(**/*.ts)`** →
  `lint-changed.sh` (`:22-26`). Runs prettier + eslint on the changed
  `.ts` file after every edit. Expect to see its output right after
  every TypeScript edit. Fix lint findings before continuing.
- **Stop** → `stop-verify.sh` (`:36`). Runs `tsc` + the coverage guard
  + tests at end of turn. 180s timeout. This is the same gate
  `npm run verify:fast` covers.

`.claude/hooks/check-dead-exports.mjs` is the dead-export gate. Every
export must be referenced from at least one other `.ts` file. Index
barrels and type files are exempt. Exit codes: `0` clean, `2` dead
exports found, `1` internal error.

## Repository-specific gotchas

- **The src tree is intentionally a scaffold.** The directories
  `src/domain/`, `src/application/`, `src/infrastructure/` exist but are
  empty. The first commit usually adds a domain entity + a use case + an
  adapter. Do not delete them.
- **No `vitest.config.ts`.** Tests rely on Vitest's defaults plus the
  glob arguments from `package.json`. If you add a config, mirror the
  existing `--passWithNoTests` semantics or update the npm scripts.
- **No `tsconfig.json` extends chain.** This project owns its tsconfig
  fully. Don't try to inherit from a shared `tsconfig.base.json` — there
  isn't one.
- **No CI config in repo.** The pipeline is local via `npm run verify` and
  the Claude Stop hook. If you add CI, mirror `scripts/verify.sh` stages
  in order.
- **ESLint flat config.** `eslint.config.mjs` is a flat config (v9+).
  Overrides for new file globs go inside the same array, not in
  `.eslintrc` files.
- **LSP noise: Pyright is misconfigured for this project.** The active
  language server reports diagnostics as `tvm_ffi_navigator Pyright`
  flagging every `.json`, `.sh`, `.mjs`, and `.md` file as Python syntax
  errors. **These are bogus.** Ignore them. `npm run typecheck` and
  `npm run verify` are the source of truth.
- **Package type is `commonjs` but the TS module is `NodeNext`.** With
  `verbatimModuleSyntax: true` you'll be writing ESM-style imports even
  though the package will compile to CJS. Don't add `.js` extensions to
  relative imports unless `npm run typecheck` complains.
- **`prettier` is in devDependencies but has no script.** It is invoked
  by `lint-changed.sh` (PostToolUse hook). If you run it manually,
  defaults apply — there is no `.prettierrc`.
- **Comments inside hooks/scripts are Russian.** Treat them as
  authoritative documentation; the translations in this file are summaries.

## File map (what's where)

```
.
├── package.json                 # scripts + devDeps; "type": "commonjs"
├── tsconfig.json                # strict NodeNext, verbatimModuleSyntax
├── eslint.config.mjs            # flat config; DDD layer rules + JSON/SDK bans
├── .testguard.json              # test-coverage guard rules
├── .claude/
│   ├── settings.json            # Claude Code hook wiring
│   ├── hooks/                   # lint-changed, protect-secrets, stop-verify,
│   │                            # check-dead-exports, check-tests
│   └── skills/                  # gate skills (unit-tests-gate shown;
│                                # others referenced via .claude/skills/)
├── scripts/
│   ├── verify.sh                # 8-stage pipeline (--fast, --from, --list)
│   ├── block-dead-code.sh       # tsc + eslint + dead-exports gate
│   └── install-hooks.sh         # idempotent git pre-commit installer
└── src/
    ├── domain/                  # entities, value objects, pure logic
    ├── application/             # use cases; ports in, ports out
    └── infrastructure/          # adapters: DB, HTTP, SDKs, fs
```

## What is NOT in this repo

- No `index.ts` at the root.
- No `vitest.config.ts` or `tsconfig.build.json`.
- No `.prettierrc`, `.editorconfig`, `.npmrc`.
- No `.github/` directory — no GitHub Actions, no PR templates, no
  CODEOWNERS.
- No `.gitignore` at the repo root (only inside `.crush/`).
- No README.md.
