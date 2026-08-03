# CLI improvement plan (status)

This file tracks the original multi-phase refactor and **what is already done** in the current codebase. Use it for orientation and **optional follow-ups**, not as a from-scratch checklist.

---

## Summary

| Area                         | Status      | Where to look |
|-----------------------------|-------------|----------------|
| Spinner / debug / errors    | **Done**    | `test/utils.test.ts`, `test/utils/investec-errors.test.ts`, `src/utils/spinner.ts`, `src/utils/cli-errors.ts` |
| Table / structured output   | **Done**    | `test/utils/output.test.ts` (`printTable` narrow width, `NO_COLOR`, `formatOutput` piped JSON) |
| Shared command runners      | **Done**    | `src/utils/command-runners.ts` (`withSpinner`, `runListCommand`, `runWriteCommand`, …) |
| Core list-style commands    | **Done**    | `accounts`, `cards`, `balances`, `transactions`, etc. use shared patterns |
| `utils.ts` decomposition    | **Done**    | `src/utils/*.ts` modules; `src/utils.ts` re-exports for compatibility |
| `--no-spinner` + deprecation | **Done**   | `src/utils/spinner-flags.ts`, warning in `src/index.ts` |
| Integration-style CLI tests | **Done**    | `test/cmds/integration-safety.test.ts` (TTY vs piped, spinner, core flows) |
| Config / profile UX         | **Done**    | `src/cmds/config-subcommands.ts`, `test/cmds/config-subcommands.test.ts` |

---

## Original phases (archived intent)

### Phase 1 — Stabilize UX + errors

- **Intent:** Baseline tests for spinners, debug flags, `normalizeInvestecError`, `printTable` edge cases.
- **Status:** Covered by unit tests above; PB/Card errors go through `normalizeInvestecError` where integrated.

### Phase 2 — Shared command runners

- **Intent:** `withSpinner`, `runListCommand`, `runWriteCommand`; migrate high-traffic commands.
- **Status:** Helpers exist; core commands migrated over time.

### Phase 3 — Split `utils.ts`

- **Intent:** Extract terminal, output, api, history, credentials, etc.
- **Status:** Extraction done under `src/utils/`; credential logic lives in `credentials-store.ts` / `credentials-validation.ts` (naming differs slightly from the original “credentials.ts” bullet).

### Phase 4 — CLI option consistency

- **Intent:** `--no-spinner` with deprecation for legacy `-s/--spinner`.
- **Status:** Implemented.

### Phase 5 — Integration safety net

- **Intent:** Integration coverage for accounts, cards, deploy, fetch; TTY vs piped.
- **Status:** `integration-safety.test.ts` covers several of these patterns; extend only if new regressions appear.

---

## Definition of done (original)

| Criterion | Notes |
|-----------|--------|
| Less per-command spinner boilerplate | Largely met via `command-runners` + shared patterns |
| `utils.ts` mostly re-exports | Met |
| Error details only in verbose/debug | **Spot-check** when touching `handleCliError` / new commands |
| Spinner cleared after success/failure | Enforced by patterns + integration tests |
| Integration tests for core flows | Met for selected commands; expandable |

---

## Optional follow-ups (not blocking)

1. **Verbose error audit** — When adding or refactoring commands, confirm stack traces / debug lines only appear with `--verbose` or `DEBUG`, consistent with `handleCliError`.
2. **More integration cases** — Add scenarios to `integration-safety.test.ts` if a specific command regresses (e.g. new file-write or spinner path).
3. **Docs** — Run `npm run docs` after changing Commander definitions so `GENERATED_README.md` stays aligned.
4. **Coverage target (80%+)** — Optional; use `vitest --coverage` if you want a numeric goal in CI.

---

## Working rule for future PRs

One logical change per PR, tests included, no unrelated refactors—same as before.

---

## Code review follow-ups (Mar 2025)

Phased plan from the architecture / error-handling review. **Status** is updated as work lands.

| Phase | Theme | Status |
|-------|--------|--------|
| **1** | Break `index` ↔ `cmds` / `utils/api` cycle; single-source exit codes | **Done** — `src/runtime-credentials.ts`; mocks + re-exports; dead `_determineExitCode` removed from `src/utils.ts` |
| **2** | Error model: `fetch.ts` codes, `credentials-store` `CliError`, `determineExitCode` heuristics, `generateCompletionScript` | **Done** — `ERROR_CODES.UNSUPPORTED_OPERATION`; fetch uses `UNSUPPORTED_OPERATION` / `INVESTEC_API_ERROR`; `readCredentialsFile` / `loadCredentialsFile` throw `CliError`; `determineExitCode` uses code map then narrower heuristics (exported); completion uses `CliError` + `determineExitCode` |
| **3** | Static `utils` imports in commands; single `configureChalk` call site | **Done** — all commands use static `isStdoutPiped` / `readStdin` from `utils.js` (no dynamic `import('../utils.js')`); `configureChalk()` only invoked from `index.ts` at startup |
| **4** | Tests: `bank`, `register`, `login`, `ai`; optional shared mock harness | **Done** (tests added; shared mock harness still optional) |
| **5** | Polish: `withCommandContext` generics, `docs.ts` typing, `INVESTEC_CLIENT_ID` policy, split `index.ts` | **Done** — see below |

### Phase 1 details (done in tree)

- **`src/runtime-credentials.ts`** — `credentialLocation`, `credentials`, `printTitleBox`, `optionCredentials` (same behavior as before; no import of `index.js`).
- **`src/index.ts`** — Imports and re-exports the above; config still uses `credentialLocation`.
- **`src/utils/api.ts`** — `optionCredentials` from `runtime-credentials.js`.
- **`src/utils.ts`** — Removed unused `_determineExitCode` duplicate of `cli-errors.ts` logic.
- **Tests** — `vi.mock('.../runtime-credentials.ts', …)` instead of `index.ts` where credentials were stubbed.

### Phase 2 (done)

1. `fetch.ts` — unsupported client → `UNSUPPORTED_OPERATION`; bad response → `INVESTEC_API_ERROR`.
2. `credentials-store.ts` — `throwCredentialPathError` for async read/load paths (`FILE_NOT_FOUND`, `PERMISSION_DENIED`, `INVALID_CREDENTIALS`).
3. `cli-errors.ts` — `EXIT_CODE_BY_CLI_CODE` for all `ERROR_CODES`, then message heuristics (avoids treating `E4016` as HTTP 401); export `determineExitCode` via `utils.ts`.
4. `index.ts` completion — `CliError` + `INVALID_INPUT`; exit code from `determineExitCode`.
5. Tests — `test/utils/cli-errors.test.ts`, extended `credentials-store` + `fetch` tests.

### Phase 3 (done)

- Replaced dynamic `import('../utils.js')` for `isStdoutPiped` / `readStdin` with static imports across list/read/write commands.
- `configureChalk()` is not invoked at `utils.ts` load; entrypoint calls it once.

### Phase 4 (done)

- `test/cmds/register.test.ts` — success path + failed HTTP → `INVALID_CREDENTIALS`.
- `test/cmds/login.test.ts` — token merge into credentials file, failed login, preserves existing cred keys.
- `test/cmds/bank.test.ts` — mocked OpenAI text reply; API error → `INVALID_INPUT`.
- `test/cmds/ai.test.ts` — valid structured JSON → `writeFile`; missing/invalid response → `INVALID_INPUT`.
- Optional: `test/helpers/cli-mocks.ts` for shared `runtime-credentials` / spinner mocks (not added).

### Phase 5 (done)

- **`src/register-cli-commands.ts`** — All Commander subcommand registration, shared option helpers (`addApiCredentialOptions`, `addSpinnerVerboseOptions`), and `disabledCommandAction`; `main()` calls `registerCliCommands(program, { credentialLocation })`.
- **`src/completion.ts`** — `generateCompletionScript` + bash/zsh generators moved out of `index.ts`.
- **`withCommandContext`** — generic `A extends readonly unknown[], R` (no `any`); same runtime behavior.
- **`docs.ts`** — `CommanderCommandInternals` + `asCommanderInternals()` instead of `(command as any)`.
- **`security.ts`** — JSDoc: why `INVESTEC_CLIENT_ID` is not in `SECRET_ENV_VARS`; test asserts it is not flagged.
- **`test/helpers/cli-mocks.ts`** — `getRuntimeCredentialsMock`, `testCredentials`, `createSpinnerControlMock`; consumers use **async** `vi.mock(…, async () => import('./cli-mocks.js'))` to satisfy Vitest hoisting.
- **`test/utils/completion.test.ts`** — smoke tests for completion output + invalid shell.
