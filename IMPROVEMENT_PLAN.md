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
