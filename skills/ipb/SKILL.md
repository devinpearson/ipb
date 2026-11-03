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
7. **Respect read-only mode.** If a command fails with `E4022` / `READ_ONLY`, the user has blocked payments and card changes for you. Do not try to turn it off (`ipb config --no-read-only`, editing `~/.ipb`, or unsetting `IPB_READ_ONLY`). Prepare the action with `--dry-run` and give the user the exact command to run themselves.
8. **Read errors as JSON.** Pass `--json` (or set `IPB_JSON_ERRORS=1`) and branch on `error.code` / `error.exitCode` rather than parsing the message text.
9. **Never retry a payment blindly.** If `pay`/`transfer` fails or is not confirmed (`E4021`), check `ipb transactions <account-id> --json` before trying again.

## First-time setup

Ask the user to run credential setup themselves so secrets never pass through the agent:

```bash
# User runs this in their own terminal: prompts with secrets hidden
ipb config

# Recommended when an agent will use ipb: block payments and card changes
ipb config --read-only

# Non-interactive alternative: pipe one secret from a password manager
op read "op://vault/investec/client-secret" | ipb config --client-id <id> --client-secret -

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
# 1. Check it without sending (works in read-only mode). Prints names, amount and reference.
ipb pay <account-id> <beneficiary-id> 250.00 "Rent" --dry-run --json

# 2. Only after the user approves those exact values:
ipb pay <account-id> <beneficiary-id> 250.00 "Rent" --yes --json
ipb transfer <from-account-id> <to-account-id> 100.00 "Savings" --yes --json
```

Amounts are in **rands** as plain decimals (`250` or `250.50`); `1e3` or `0x10` are rejected. Without a terminal, `--yes` is required. A payment that needs approval in the Investec app has `AuthorisationRequired: true` in the JSON result: tell the user to approve it there.

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

Success exits `0`. Non-zero exits are typed: `2` validation/usage, `3` auth, `4` file, `5` API (incl. rate limits and unconfirmed payments), `6` network, `7` permission (incl. read-only mode).

With `--json` or `IPB_JSON_ERRORS=1`, a failure prints one line on **stderr** and nothing on stdout:

```json
{"error":{"code":"E4013","name":"INVALID_INPUT","message":"Amount must be positive","exitCode":2,"command":"ipb pay","hint":null}}
```

Bad arguments give `"name": "USAGE_ERROR"` with `"code": null`; run `ipb <command> --help`.

## Help the user recover

| Problem | What to try |
|---------|-------------|
| Auth / invalid credentials | Re-run `ipb config`, check profile with `ipb config profile show` |
| Missing MAU credentials | `ipb config --mau-client-id … --mau-client-secret … --mau-api-key …` |
| Missing card key | `ipb cards` then pass `-c` / `ipb config --card-key` |
| Rate limited | Wait and retry; use `--verbose` to see retry behavior |
| Command unknown | `ipb --help` — do not invent subcommands |
| Disabled command error | Use editor + `deploy` / `run` instead of `ai` / `login` / `register` / `bank` |
| `E4022` read-only | Use `--dry-run` and hand the command to the user; do not disable read-only mode |
| `E4023` keychain | Ask the user to unlock their keychain or re-enter secrets with `ipb config`; never read the keychain yourself |
| `E4021` payment not confirmed | Check `ipb transactions <account-id> --json` before any retry |

## Installing this skill on any agent

Copy this folder (`ipb/` containing `SKILL.md`) into the agent’s skills directory, for example:

- **Cursor:** `~/.cursor/skills/ipb/` (personal) or `<repo>/.cursor/skills/ipb/` (project)
- **Other agents:** follow that product’s “custom skills / AGENTS / tools” docs — the important part is that `SKILL.md` remains the entry file.

The skill does not require the ipb source repository—only a working `ipb` binary.

## Command catalog

For a fuller flag list, see [reference.md](reference.md) or run `ipb docs` / `ipb <command> --help`.
