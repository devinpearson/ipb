---
name: ipb
description: >-
  Operate the Investec Programmable Banking CLI (ipb): configure credentials,
  list cards/accounts, deploy and simulate card code, fetch logs, transfer/pay,
  Mauritius (MAU) Open Banking, and read machine-readable JSON output. Use when
  the user asks to run ipb, manage programmable cards, deploy card JavaScript,
  check Investec accounts or balances, use MAU APIs, or automate Investec
  Programmable Banking from a terminal agent.
---

# Use the `ipb` CLI

You are helping a user operate **investec-ipb** (`ipb`), a terminal CLI for Investec Programmable Banking cards and related APIs. Prefer running real `ipb` commands over inventing HTTP calls.

## Prerequisites

- CLI installed and on `PATH` (`ipb --version` works).
- Node.js ≥ 24 if installed via npm: `npm install -g investec-ipb`.
- Investec API credentials from the [Developer Portal](https://developer.investec.com) (client id, client secret, API key). Card operations also need a card key. Mauritius (MAU) commands need separate MAU credentials.

If `ipb` is missing, tell the user how to install it; do not assume this git repo is present.

## Agent rules

1. **Discover before guessing:** run `ipb --help` or `ipb <command> --help` when unsure of flags.
2. **Prefer JSON for agents:** add `--json` (or pipe stdout) when you need to parse results. Use `--yaml` only if the user asks.
3. **Never put secrets in chat logs or commits.** Prefer stored credentials (`ipb config`) over repeating `--client-secret` / `--api-key` on every command.
4. **Confirm money movement.** For `transfer` and `pay`, show the planned account/beneficiary/amount and get explicit user approval before running (unless the user already gave exact values and `--yes` intent).
5. **Confirm destructive card ops.** `deploy`, `publish`, `disable`, and similar change live card behavior — confirm target card key and file first. Use `--yes` only when the user clearly wants non-interactive execution.
6. **Do not use disabled commands:** `ipb ai`, `ipb bank`, `ipb register`, and `ipb login` are disabled and fail with an error. Do not retry them.

## First-time setup

```bash
# Save default credentials (omit secrets from agent transcripts when possible)
ipb config --client-id <id> --client-secret <secret> --api-key <key>

# Optional: card key for card commands
ipb config --card-key <card-key>

# Optional: Mauritius (MAU) credentials (separate from ZA PB/Card)
ipb config --mau-client-id <id> --mau-client-secret <secret> --mau-api-key <key>

# Optional: named environments
ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>
ipb config profile set production
```

Credentials live under `~/.ipb/` (owner-only permissions). Profiles: `ipb config profile list|set|show|delete`. Edit in `$EDITOR`: `ipb config edit`.

Creds can also come from env vars (`INVESTEC_CLIENT_ID`, `INVESTEC_CLIENT_SECRET`, `INVESTEC_API_KEY`, `INVESTEC_CARD_KEY`, optional `INVESTEC_HOST`; MAU: `INVESTEC_MAU_CLIENT_ID`, `INVESTEC_MAU_CLIENT_SECRET`, `INVESTEC_MAU_API_KEY`, optional `INVESTEC_MAU_HOST`) — warn that env secrets are less ideal than the credentials file.

## Common workflows

### Inspect cards and accounts

```bash
ipb cards --json
ipb accounts --json
ipb balances <account-id> --json
ipb transactions <account-id> --json
ipb beneficiaries --json
```

### Mauritius (MAU) Open Banking

Uses separate credentials from ZA PB. Account IDs are numeric. Transactions/documents require `--from` / `--to` (YYYY-MM-DD).

```bash
ipb mau accounts --json
ipb mau balances 5331 --json
ipb mau transactions 5331 --from 2024-01-01 --to 2024-01-31 --json
ipb mau documents 5331 --from 2025-01-01 --to 2025-01-31 --json
ipb mau statement 5331 2025-01-31 --output statement.pdf
```

### Local card-code simulation (no Investec account required for `run`)

```bash
ipb run -f main.js -e prod --amount 60000 --currency ZAR --mcc 0000 \
  --merchant "Test Merchant" --city "Cape Town" --country ZA
```

Amount is in **cents**. Scaffold a project with `ipb new <name>` (optional `--template default|petro`).

### Deploy code to a card

```bash
# Typical flow: confirm card key, then deploy (uploads + publishes)
ipb cards --json
ipb deploy -f main.js -c <card-key>           # add -e <env> if using .env.<env>
ipb deploy -f main.js -c <card-key> --yes     # skip confirm (automation only)
```

Related: `ipb upload`, `ipb publish`, `ipb fetch`, `ipb published`, `ipb env` / `ipb upload-env`, `ipb simulate` (remote simulation), `ipb logs -c <card-key>`, `ipb enable|disable -c <card-key>`.

### Reference data for simulations

```bash
ipb currencies --json
ipb countries --json
ipb merchants --json
```

### Payments (high trust)

```bash
ipb transfer ...   # between own accounts — confirm details first
ipb pay ...        # to a beneficiary — confirm details first
```

Always run with `--help` for the exact required flags before executing.

## Output, scripting, and exit codes

| Flag / behavior | Use when |
|-----------------|----------|
| `--json` | Parse structured output in the agent |
| `--yaml` | User wants YAML |
| `--output <file>` | Write structured output to a file |
| Piped stdout | Auto JSON-friendly behavior; spinners off |
| `--verbose` / `DEBUG=1` | Debugging API/retry issues |
| `--no-spinner` | Quieter TTY runs |
| `--profile <name>` | Non-default credentials profile |
| `--no-history` | Skip writing to `~/.ipb/history.json` |

Success exits `0`. Non-zero exits are typed (validation, auth, file, API, network, permission). Error text looks like `Error (E####): …`.

## Help the user recover

| Problem | What to try |
|---------|-------------|
| Auth / invalid credentials | Re-run `ipb config`, check profile with `ipb config profile show` |
| Missing MAU credentials | `ipb config --mau-client-id … --mau-client-secret … --mau-api-key …` |
| Missing card key | `ipb cards` then pass `-c` / `ipb config --card-key` |
| Rate limited | Wait and retry; use `--verbose` to see retry behavior |
| Command unknown | `ipb --help` — do not invent subcommands |
| Disabled command error | Use editor + `deploy` / `run` instead of `ai` / `login` / `register` / `bank` |

## Installing this skill on any agent

Copy this folder (`ipb/` containing `SKILL.md`) into the agent’s skills directory, for example:

- **Cursor:** `~/.cursor/skills/ipb/` (personal) or `<repo>/.cursor/skills/ipb/` (project)
- **Other agents:** follow that product’s “custom skills / AGENTS / tools” docs — the important part is that `SKILL.md` remains the entry file.

The skill does not require the ipb source repository—only a working `ipb` binary.

## Command catalog

For a fuller flag list, see [reference.md](reference.md) or run `ipb docs` / `ipb <command> --help`.
