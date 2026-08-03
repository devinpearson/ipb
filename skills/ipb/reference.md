# `ipb` command catalog (agent cheat sheet)

Prefer `ipb <command> --help` for authoritative flags. This is a workflow map, not a full man page.

## Setup and config

| Command | Purpose |
|---------|---------|
| `ipb config` | Save client id/secret/api key (and optional card key) |
| `ipb config --profile <name> …` | Write a named profile |
| `ipb config profile list\|set\|show\|delete` | Manage active profile |
| `ipb config edit` | Open credentials in `$EDITOR` |
| `ipb completion bash\|zsh` | Shell completion script |
| `ipb env-list` | Document supported environment variables |

## Cards and code

| Command | Purpose |
|---------|---------|
| `ipb cards` (`c`) | List cards / keys |
| `ipb new <name>` | Scaffold local project (`--template default\|petro`) |
| `ipb run` (`r`) | Local emulator (file + transaction fields) |
| `ipb deploy` (`d`) | Upload env (optional) + code + publish |
| `ipb upload` (`up`) | Upload code only |
| `ipb publish` (`pub`) | Publish uploaded code |
| `ipb published` | Fetch published code metadata/content |
| `ipb fetch` (`f`) | Download code from card |
| `ipb simulate` | Simulate against card/API context |
| `ipb logs` (`log`) | Execution logs |
| `ipb env` / `ipb upload-env` | Card environment variables |
| `ipb enable` / `ipb disable` | Toggle code on card |

## Accounts and payments

| Command | Purpose |
|---------|---------|
| `ipb accounts` (`acc`) | List accounts |
| `ipb balances` (`bal`) | Balance for an account |
| `ipb transactions` (`tx`) | Transactions |
| `ipb beneficiaries` | Beneficiaries |
| `ipb transfer` | Transfer between accounts |
| `ipb pay` | Pay a beneficiary |

## Reference data

| Command | Purpose |
|---------|---------|
| `ipb currencies` | Currency codes |
| `ipb countries` | Countries |
| `ipb merchants` | Sample merchants / MCC helpers |

## Do not use

| Command | Status |
|---------|--------|
| `ipb ai` | Disabled |
| `ipb bank` | Disabled |
| `ipb register` | Disabled |
| `ipb login` | Disabled |

## Shared options (most API commands)

- Auth overrides: `--client-id`, `--client-secret`, `--api-key`, `--host`, `--credentials-file`, `--profile`
- Output: `--json`, `--yaml`, `--output <file>`, `-v` / `--verbose`
- Spinner: `--no-spinner` (preferred); `-s` / `--spinner` deprecated
- Destructive skips: `--yes` where supported

## Typical agent sequence

1. `ipb --version` — confirm install  
2. `ipb cards --json` or `ipb accounts --json` — confirm auth  
3. Perform the user task with the smallest command that fits  
4. For deploys: show file + card key → run `deploy` → optionally `logs`  
5. Summarize results from JSON, not raw spinner UI
