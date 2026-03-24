# CLI Improvement Plan

## Phase 1: Stabilize UX + Errors (1-2 sessions)

**Goal:** Stop regressions in spinner/output/error behavior before deeper refactors.

### Tasks
- Add tests for `isDebugEnabled`, `resolveSpinnerState`, `stopSpinner`, and `normalizeInvestecError`.
- Add terminal-output tests for `printTable` (narrow width, no-color, piped).
- Normalize API error handling for both Card and PB auth/request paths.

### Deliverable
- A CLI behavior baseline test suite with consistent user-facing error behavior.

## Phase 2: Introduce Shared Command Runners (2-3 sessions)

**Goal:** Remove command-level duplication and enforce consistent command lifecycle behavior.

### Tasks
- Create reusable helpers:
  - `withSpinner(...)`
  - `runListCommand(...)`
  - `runWriteCommand(...)`
- Migrate high-impact commands first: `accounts`, `cards`, `balances`, `transactions`.
- Verify output parity and remove per-command spinner boilerplate.

### Deliverable
- Reduced duplicate code in core commands and fewer spinner regressions.

## Phase 3: Split `src/utils.ts` by Responsibility (3-5 sessions)

**Goal:** Improve maintainability and testability.

### Tasks
- Extract modules incrementally:
  - `utils/terminal.ts`
  - `utils/output.ts`
  - `utils/errors.ts`
  - `utils/api.ts`
  - `utils/credentials.ts`
  - `utils/history.ts`
- Keep `src/utils.ts` as compatibility re-export during migration.
- Move tests with each extracted module.

### Deliverable
- Modular utility architecture with clear ownership boundaries.

## Phase 4: CLI Option Consistency + Compatibility (1 session)

**Goal:** Improve developer experience without breaking users.

### Tasks
- Introduce `--no-spinner` while preserving existing `-s,--spinner` behavior.
- Add deprecation warning text and update docs.

### Deliverable
- Clearer option semantics and migration path.

## Phase 5: Integration Safety Net (2 sessions)

**Goal:** Catch real-user flow regressions.

### Tasks
- Add integration tests for `accounts`, `cards`, `deploy`, `fetch`.
- Validate TTY vs piped output, spinner cleanup, and error display modes.

### Deliverable
- End-to-end confidence for core workflows.

## Prioritization Order
1. Phase 1 (tests + error normalization)
2. Phase 2 (shared command helpers)
3. Phase 3 (modularize `utils.ts`)
4. Phase 5 (integration hardening; can begin in parallel)
5. Phase 4 (option polish)

## Suggested Working Cadence
- Per PR rule: one logical slice, tests included, no mixed concerns.

### PR Sequence Example
1. `test: add spinner/debug/error unit coverage`
2. `refactor: add withSpinner + migrate accounts/cards`
3. `refactor: migrate balances/transactions`
4. `refactor: extract utils/error + api modules`
5. `test: add integration coverage for core commands`
6. `feat: add --no-spinner alias + docs`

## Definition of Done
- Core command flows no longer duplicate spinner/error boilerplate.
- `utils.ts` is decomposed and mostly re-exports.
- Error details show only in verbose/debug mode, consistently.
- Spinner text never remains on screen after success/error.
- Integration tests cover core commands and terminal modes.
