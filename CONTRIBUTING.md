# Contributing to investec-ipb

Thank you for contributing. This guide covers local development, tests, docs, version bumps, and releases. End-user docs live in [README.md](./README.md); packaging detail lives in [DISTRIBUTION.md](./DISTRIBUTION.md).

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Clone and install](#clone-and-install)
- [Project layout](#project-layout)
- [Run locally](#run-locally)
- [Build](#build)
- [Lint, format, and types](#lint-format-and-types)
- [Tests](#tests)
- [Adding or changing a command](#adding-or-changing-a-command)
- [Documentation](#documentation)
- [Demo GIFs (VHS tapes)](#demo-gifs-vhs-tapes)
- [Git hooks](#git-hooks)
- [Pull requests](#pull-requests)
- [Version bumps](#version-bumps)
- [Releasing](#releasing)
- [Useful environment variables for contributors](#useful-environment-variables-for-contributors)
- [Where to get help](#where-to-get-help)

## Code of conduct

Please follow [.github/CODE_OF_CONDUCT.md](./.github/CODE_OF_CONDUCT.md). Security reports: [.github/SECURITY.md](./.github/SECURITY.md).

## Prerequisites

- **Node.js ≥ 24** (see `engines` in `package.json`)
- **npm** (comes with Node)
- Optional for packaging: enough disk for `esbuild` + `@yao-pkg/pkg` binaries
- Optional for demo GIFs: [VHS](https://github.com/charmbracelet/vhs) and a terminal that can record

Confirm:

```sh
node -v   # v24.x or newer
npm -v
```

## Clone and install

```sh
git clone https://github.com/devinpearson/ipb.git
cd ipb
npm install
```

`npm install` runs `prepare` → Husky (git hooks).

## Project layout

| Path | Role |
|------|------|
| `src/index.ts` | CLI entry; version from `package.json` |
| `src/register-cli-commands.ts` | Commander registration |
| `src/cmds/` | Command implementations (kebab-case files) |
| `src/runtime-credentials.ts` | Credentials helpers (avoid importing `index` from cmds) |
| `src/utils/` | Shared modules; `src/utils.ts` re-exports |
| `src/errors.ts` | `CliError`, `ExitCode`, `ERROR_CODES` |
| `src/completion.ts` | Shell completion scripts |
| `bin/` | Build output (`tsc` + copied templates/assets) — gitignored |
| `templates/` | Project scaffolds for `ipb new` |
| `assets/` | README / VHS GIFs |
| `test/cmds/`, `test/utils/` | Vitest suites |
| `test/helpers/cli-mocks.ts` | Shared Vitest mocks |
| `skills/ipb/` | Portable agent skill for *using* the CLI |
| `GENERATED_README.md` | Auto-generated command reference |

Stack: TypeScript (strict, ESM, NodeNext), Commander 14, Vitest, Biome.

## Run locally

Always build before running the compiled binary (or after changing TypeScript):

```sh
npm run build
node bin/index.js --help
node bin/index.js cards --json
```

Shortcut while iterating:

```sh
npm run build && node bin/index.js <command> [options]
```

Link a global `ipb` that points at this checkout (optional):

```sh
npm run build
npm link
ipb --version
```

Use a disposable profile so you do not overwrite personal credentials:

```sh
ipb config --profile local-dev --client-id … --client-secret … --api-key …
ipb cards --profile local-dev
```

Mock APIs without hitting Investec (where supported):

```sh
DEBUG=true node bin/index.js accounts
# or
IPB_MOCK_APIS=1 node bin/index.js accounts
```

Skip npm update checks while developing offline / recording tapes:

```sh
IPB_NO_UPDATE_CHECK=1 node bin/index.js --help
```

## Build

```sh
npm run build        # clean → tsc → copy templates/assets/instructions
npm run type-check   # tsc only (no emit side effects beyond typecheck script)
npm run clean        # remove bin/
```

Standalone binary path (for packaging smoke tests):

```sh
npm run bundle       # esbuild → dist-bundle/index.cjs (injects version)
npm run pkg:linux    # example platform target — see package.json scripts
npm run verify:ci    # build + test:run + bundle (also used by pre-push)
```

## Lint, format, and types

```sh
npm run lint           # Biome check
npm run lint:fix      # Biome auto-fix
npm run format         # Biome format write
npm run format:check
npm run lint:md        # markdownlint-cli2
npm run lint:md:fix
npm run type-check
```

Full gate used before publish / CI-style checks:

```sh
npm run ci
# build + type-check + lint + lint:md + format:check + test:run + npm audit
```

Style notes (Biome): single quotes, semicolons, 2-space indent, line width 100. ESM imports use `.js` extensions.

## Tests

```sh
npm test              # Vitest watch
npm run test:run      # single run (CI / pre-push path)
npm run dev           # alias of vitest watch
```

Focused runs:

```sh
npm run test:run -- test/cmds/deploy.test.ts
npm run test:run -- test/utils/cli-errors.test.ts
```

### Conventions

- One primary file per command area under `test/cmds/`.
- Mock `runtime-credentials` with the async factory + `getRuntimeCredentialsMock` from `test/helpers/cli-mocks.ts`.
- Prefer `vi.importActual` on `utils` and override only what the test needs (`initializePbApi`, `createSpinner`, …).
- Assert `CliError` / exit behaviour where relevant; cover success and failure paths.
- Do not commit secrets or real credential files.

## Adding or changing a command

1. Implement `src/cmds/<name>.ts` with JSDoc on the exported function.
2. Register in `src/register-cli-commands.ts` (`addApiCredentialOptions` / `addSpinnerVerboseOptions`, `withCommandContext`, help examples).
3. Export from `src/cmds/index.ts` if needed elsewhere.
4. Update `src/completion.ts` when the public surface changes.
5. Add `test/cmds/<name>.test.ts`.
6. Run `npm run docs` so `GENERATED_README.md` matches Commander.
7. Prefer shared runners in `src/utils/command-runners.ts` over new spinner boilerplate.
8. User-facing errors: `throw new CliError(ERROR_CODES.*, '…')` and update `EXIT_CODE_BY_CLI_CODE` in `src/utils/cli-errors.ts` if you add a code.

**Do not re-enable** hidden `ai` / `bank` / `register` / `login` without an explicit product decision (they throw `COMMAND_DISABLED`).

PR hygiene: one logical change per PR; include tests; avoid unrelated refactors.

## Documentation

| Doc | Audience |
|-----|----------|
| [README.md](./README.md) | Users (Divio: tutorials / how-to / reference / explanation) |
| [GENERATED_README.md](./GENERATED_README.md) | Generated command/option reference |
| [DISTRIBUTION.md](./DISTRIBUTION.md) | Binaries, Homebrew, deb/snap, formula notes |
| [skills/ipb/](./skills/ipb/) | Agents operating the installed CLI |
| This file | Contributors |

After changing Commander definitions:

```sh
npm run docs
```

Commit the updated `GENERATED_README.md` with the command change.

User-facing README download examples should use the same version as `package.json` when you cut a release (see [Version bumps](#version-bumps)).

## Demo GIFs (VHS tapes)

```sh
IPB_NO_UPDATE_CHECK=1 npm run tapes
# builds, npm links local ipb, then runs scripts/tapes.sh — requires VHS
```

Regenerate assets under `assets/` when UX of recorded commands changes meaningfully.

## Git hooks

Husky **pre-push** runs:

```sh
npm run verify:ci   # build + test:run + bundle
```

Fix failures locally before pushing. Do not use `--no-verify` unless you have a documented emergency reason.

## Pull requests

1. Branch from an up-to-date `main`.
2. Keep the diff focused; mention user-visible behaviour in the PR body.
3. Ensure `npm run ci` (or at least `npm run test:run` + `npm run lint`) passes.
4. Update README / GENERATED_README / CONTRIBUTING when behaviour or contributor workflows change.
5. Link related issues.

Suggested PR checklist:

- [ ] Tests added or updated
- [ ] `npm run lint` / `lint:md` clean when you touched code or markdown
- [ ] `npm run docs` if Commander options/commands changed
- [ ] No secrets in the diff
- [ ] Version/docs URLs updated only as part of an intentional release bump

## Version bumps

The CLI version is **sourced from `package.json`**:

- Runtime (`node bin/index.js`): `createRequire` → `../package.json`
- Standalone binaries: esbuild `define` injects `__IPB_PACKAGE_VERSION__` at bundle time

You do **not** hardcode the version in `src/index.ts`.

### SemVer guidance

| Change | Bump |
|--------|------|
| Breaking CLI/API behaviour for users | major |
| New commands/flags, non-breaking improvements | minor |
| Bug fixes, docs, dependency patches | patch |

### Checklist when bumping (example `0.8.4` → `0.8.5`)

1. Update `"version"` in [`package.json`](./package.json) (lockfile version field updates on install).
2. Update user-facing version strings in docs that pin a release URL, for example README download links (`v0.8.4` → `v0.8.5`) and any examples in DISTRIBUTION / Ubuntu docs you maintain.
3. Update Homebrew formula version/URL/sha when you publish that channel (see DISTRIBUTION.md).
4. Rebuild and confirm:

   ```sh
   npm run build
   node bin/index.js --version    # must print the new version
   npm run bundle
   # optional: npm run pkg:macos|linux and run the binary --version
   ```

5. Commit with a clear message, for example `chore: release 0.8.5`.
6. Tag and push (maintainers):

   ```sh
   git tag v0.8.5
   git push origin main
   git push origin v0.8.5
   ```

Tag shape must be `v*.*.*` to trigger release workflows.

### What not to do

- Do not bump version in random source files hoping `--version` changes.
- Do not tag before `package.json` matches the tag.
- Do not leave README binary URLs on an old version after a public release.

## Releasing

Maintainers typically:

1. Complete the [version bump checklist](#version-bumps).
2. Merge to `main`.
3. Push tag `vX.Y.Z`.

Automated workflows (see `.github/workflows/`):

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `node.js.yml` | push/PR | Build + test; packaging smoke |
| `publish.yml` | tag `v*.*.*` | `npm publish` |
| `release.yml` | tag `v*.*.*` | Build platform binaries + GitHub Release assets |
| `snap-release.yml` | (see workflow) | Snap packaging |

After the GitHub Release exists, update Homebrew / distro packages as described in [DISTRIBUTION.md](./DISTRIBUTION.md) and [UBUNTU_DISTRIBUTION.md](./UBUNTU_DISTRIBUTION.md).

Dry-run package contents before a real publish:

```sh
npm run build
npm pack --dry-run
```

Published npm package includes the `bin/` folder (`files` in package.json); `package.json` is always included by npm.

## Useful environment variables for contributors

| Variable | Use |
|----------|-----|
| `DEBUG` / `--verbose` | Verbose CLI logging |
| `IPB_MOCK_APIS` | Prefer mock API clients when available |
| `IPB_NO_UPDATE_CHECK` | Skip registry version checks |
| `NO_COLOR` / `FORCE_COLOR` | Colour control |
| `EDITOR` | `ipb config edit` |
| `REJECT_UNAUTHORIZED` | TLS behaviour for custom hosts (use carefully) |

List all documented env vars:

```sh
node bin/index.js env-list
```

## Where to get help

- Open a GitHub issue for bugs and feature ideas
- User how-tos: [README.md](./README.md)
- Packaging: [DISTRIBUTION.md](./DISTRIBUTION.md)
- Historical refactor notes: [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md) (status doc, not a required checklist)
