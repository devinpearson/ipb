# Investec Programmable Banking CLI

Deploy programmable card code, simulate transactions locally, and manage Investec accounts from the terminal. Binary name: `ipb`.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![NPM Version](https://img.shields.io/npm/v/investec-ipb)

Community-maintained project aligned with the Investec Programmable Banking community. Not officially endorsed or supported by Investec—use and contribute with care.

---

## Documentation map

This README follows [Divio’s documentation system](https://documentation.divio.com/): pick the section that matches what you need.

| I want to… | Go to |
|------------|--------|
| Learn by doing (first successful flow) | [Tutorials](#tutorials) |
| Solve a specific task | [How-to guides](#how-to-guides) |
| Look up a command, flag, or error code | [Reference](#reference) |
| Understand why the CLI works this way | [Explanation](#explanation) |
| Contribute or release | [CONTRIBUTING.md](./CONTRIBUTING.md) |

Full option lists for every command: [GENERATED_README.md](./GENERATED_README.md) (or run `ipb <command> --help` / `ipb docs`).

---

## Tutorials

Learning-oriented: follow in order. You will install the CLI, save credentials, list a card, scaffold a project, simulate locally, deploy, and fetch logs.

### Your first card flow

**Time:** about 10 minutes. **You need:** Node.js 24+ (or a standalone binary), Investec API credentials from the [Developer Portal](https://developer.investec.com), and a programmable card.

#### 1. Install

```sh
npm install -g investec-ipb
ipb --version
```

Other install methods: [How to install](#how-to-install).

#### 2. Save credentials

Get your client ID, client secret, and API key from the [API quick start guide](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-api-keys).

```sh
ipb config --client-id <client-id> --client-secret <client-secret> --api-key <api-key>
```

Prefer credential files over putting secrets in environment variables. See [Explanation: credentials and secrets](#credentials-and-secrets).

#### 3. List your cards

```sh
ipb cards
```

Note a **card key** for later steps (`-c`).

![cards command](assets/cards.gif)

#### 4. Scaffold a project

```sh
ipb new my-card-app
cd my-card-app
```

Optional templates: `--template default` or `--template petro`.

![new command](assets/new.gif)

#### 5. Simulate locally (no API keys required for this step)

Amount is in **cents**:

```sh
ipb run -f main.js -e prod --amount 60000 --currency ZAR --mcc 0000 \
  --merchant "Test Merchant" --city "Cape Town" --country ZA
```

![run command](assets/run.gif)

#### 6. Deploy to the card

`deploy` uploads (and can publish) code. You will be asked to confirm unless you pass `--yes`.

```sh
ipb deploy -f main.js -c <card-key>
```

![deploy command](assets/deploy.gif)

#### 7. Fetch execution logs

```sh
ipb logs -f executions.json -c <card-key>
```

![logs command](assets/logs.gif)

You now have a working loop: edit → `ipb run` → `ipb deploy` → `ipb logs`. Next: [How-to guides](#how-to-guides) for profiles, env files, accounts, and automation.

---

## How-to guides

Goal-oriented recipes. For every flag, use `ipb <command> --help`.

### How to install

**npm (recommended if you already use Node.js 24+):**

```sh
npm install -g investec-ipb
```

On Windows PowerShell (if scripts are blocked):

```sh
Set-ExecutionPolicy Unrestricted -Scope CurrentUser
```

**Homebrew (standalone binary, no Node.js):**

```sh
brew tap devinpearson/ipb
brew install ipb
```

**Direct download:** binaries on [GitHub Releases](https://github.com/devinpearson/ipb/releases).

macOS:

```sh
# Apple Silicon
curl -L https://github.com/devinpearson/ipb/releases/download/v0.9.1/ipb-macos-arm64 -o ipb
chmod +x ipb
sudo mv ipb /usr/local/bin/

# Intel
curl -L https://github.com/devinpearson/ipb/releases/download/v0.9.1/ipb-macos-x64 -o ipb
chmod +x ipb
sudo mv ipb /usr/local/bin/
```

Linux (.deb):

```sh
wget https://github.com/devinpearson/ipb/releases/download/v0.9.1/ipb_0.9.1_amd64.deb
sudo dpkg -i ipb_0.9.1_amd64.deb
sudo apt-get install -f
```

Linux binary:

```sh
curl -L https://github.com/devinpearson/ipb/releases/download/v0.9.1/ipb-linux-x64 -o ipb
# or: ipb-linux-arm64
chmod +x ipb
sudo mv ipb /usr/local/bin/
```

Windows: download `ipb-win-x64.exe`, rename to `ipb.exe`, add to `PATH`.

More packaging options: [DISTRIBUTION.md](./DISTRIBUTION.md).

### How to configure credentials and profiles

```sh
# Default credentials (~/.ipb/.credentials.json, mode 600)
ipb config --client-id <id> --client-secret <secret> --api-key <key>

# Optional card key / host — see ipb config --help
ipb config --card-key <card-key>

# Named profiles
ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>
ipb config --profile staging --client-id <id> --client-secret <secret> --api-key <key>
ipb config profile set production
ipb config profile list
ipb config profile show
```

Use a profile on any command:

```sh
ipb cards --profile staging
ipb deploy --profile production -f main.js -c <card-key>
```

Edit in your editor (`EDITOR`, default `nano` / `notepad.exe`):

```sh
ipb config edit
ipb config edit --profile production
```

Custom credentials file:

```sh
ipb cards --credentials-file /path/to/credentials.json
```

### How to deploy code and manage card environments

```sh
# One-shot deploy (upload + publish path; confirms by default)
ipb deploy -f main.js -e prod -c <card-key>
ipb deploy -f main.js -c <card-key> --yes

# Split steps
ipb upload -f main.js -c <card-key>
ipb publish -f main.js --code-id <code-id> -c <card-key>

# Environment variables on the card
ipb env -f env.json -c <card-key>
ipb upload-env -f env.json -c <card-key>

# Download code from the card
ipb fetch -f backup.js -c <card-key>
ipb published -f published.js -c <card-key>
```

Use `.env.<name>` locally and pass `-e <name>` when the command supports it (for example `deploy` / `run`).

![upload command](assets/upload.gif)

### How to simulate transactions

**Local emulator** (no Investec account required):

```sh
ipb run -f main.js -e prod --amount 60000 --currency ZAR --mcc 0000 \
  --merchant "Test Merchant" --city "Cape Town" --country ZA
```

**Online simulator** (uses API / card context and remote env):

```sh
ipb simulate -f main.js -c <card-key> --amount 60000 --currency ZAR --mcc 0000 \
  --merchant "Test Merchant" --city "Cape Town" --country ZA
```

Reference data for MCC / country / currency values:

```sh
ipb countries
ipb currencies
ipb merchants
```

### How to enable or disable code on a card

```sh
ipb enable -c <card-key>
ipb disable -c <card-key>          # confirms
ipb disable -c <card-key> --yes
```

![toggle command](assets/toggle.gif)

### How to work with accounts and payments

```sh
ipb accounts
ipb balances <accountId>
ipb transactions <accountId>
ipb beneficiaries
```

Money movement **requires confirmation** (or `--yes` for automation):

```sh
ipb transfer <accountId> <beneficiaryAccountId> <amount> <reference>
ipb pay <accountId> <beneficiaryId> <amount> <reference>
```

Amounts for transfer/pay are in **rands** (for example `100.50`), not cents.

### How to install shell completion

**Bash:**

```sh
mkdir -p ~/.bash_completion.d
ipb completion bash > ~/.bash_completion.d/ipb
echo "source ~/.bash_completion.d/ipb" >> ~/.bashrc
```

**Zsh:**

```sh
mkdir -p ~/.zsh/completions
ipb completion zsh > ~/.zsh/completions/_ipb
# In ~/.zshrc:
# fpath=(~/.zsh/completions $fpath)
# autoload -U compinit && compinit
```

### How to automate safely

```sh
# Machine-readable output
ipb cards --json
ipb accounts --json | jq .

# Skip confirms only when intentional
ipb deploy -f main.js -c <card-key> --yes

# Quiet / debug
ipb accounts --no-spinner
ipb accounts --verbose
# or: DEBUG=1 ipb accounts
```

When stdout is piped, the CLI favours structured output and turns spinners off. Destructive commands need `--yes` in non-interactive use.

Handle exit codes in scripts:

```bash
if ipb deploy -f main.js -c "$CARD" --yes; then
  echo "ok"
else
  echo "failed with exit $?"
fi
```

See [Exit codes](#exit-codes) and [Error codes](#error-codes).

---

## Reference

Information-oriented lookup. Authoritative flags: `ipb <command> --help` or [GENERATED_README.md](./GENERATED_README.md).

### Command map

| Command | Purpose |
|---------|---------|
| `cards` (`c`) | List programmable cards |
| `config` (`cfg`) | Save credentials; `profile` / `edit` subcommands |
| `new` | Scaffold a local project |
| `run` (`r`) | Local transaction simulation |
| `simulate` | Online simulator |
| `deploy` (`d`) | Deploy code to a card |
| `upload` (`up`) / `publish` (`pub`) | Upload or publish code |
| `fetch` (`f`) / `published` | Download saved or published code |
| `env` / `upload-env` | Card environment variables |
| `logs` (`log`) | Execution logs |
| `enable` / `disable` | Toggle code on a card |
| `accounts` (`acc`) / `balances` (`bal`) / `transactions` (`tx`) | Account data |
| `beneficiaries` / `transfer` / `pay` | Beneficiaries and payments |
| `countries` / `currencies` / `merchants` | Reference data |
| `completion` / `docs` / `env-list` | Shell completion, docs dump, env catalogue |

These commands are **disabled** and return an error: `ai`, `bank`, `register`, `login`.

### Shared options (most API commands)

- Auth: `--client-id`, `--client-secret`, `--api-key`, `--host`, `--credentials-file`, `--profile`
- Output: `--json`, `--yaml`, `--output <file>`, `-v` / `--verbose`
- Spinner: `--no-spinner` (preferred); `-s` / `--spinner` is deprecated
- Destructive: `--yes` where supported

### Environment variables

List everything the CLI documents:

```sh
ipb env-list
ipb env-list --json
```

Common categories:

- **API:** `INVESTEC_HOST`, `INVESTEC_CLIENT_ID`, `INVESTEC_CLIENT_SECRET`, `INVESTEC_API_KEY`, `INVESTEC_CARD_KEY`
- **Behaviour:** `DEBUG`, `REJECT_UNAUTHORIZED`, `NO_COLOR`, `FORCE_COLOR`, `EDITOR`, `PAGER`, `TMPDIR`, `IPB_NO_UPDATE_CHECK`

### Exit codes

| Exit | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Validation / bad input |
| `3` | Authentication |
| `4` | File |
| `5` | API (includes rate limits) |
| `6` | Network |
| `7` | Permission |

### Error codes

Messages look like `Error (E####): …`.

| Code | Description |
|------|-------------|
| `E4002` | Missing API token |
| `E4003` | Missing card key |
| `E4004` | Missing environment file |
| `E4005` | Invalid credentials |
| `E4007` | Template not found |
| `E4008` | Invalid project name |
| `E4009` | Project exists |
| `E4010` | File not found |
| `E4012` | Missing account ID |
| `E4014` | Rate limit exceeded |
| `E5001` | Deploy / API operation failed |

Quick fixes: missing card key → `ipb cards` then `-c`; bad auth → `ipb config`; missing `.env.<env>` → create the file or change `-e`.

---

## Explanation

Understanding-oriented background. Skip this until you care about the “why”.

### Credentials and secrets

Credential files under `~/.ipb/` use owner-only permissions (`600`) and atomic writes. Environment variables are convenient but can leak via process lists, CI logs, and shell history. The CLI may warn when secrets appear in the environment (especially with `--verbose` / `DEBUG` or in CI). Prefer `ipb config` and profiles for day-to-day use.

**Resolution order** (highest wins):

1. Command-line options (`--api-key`, …)
2. `--profile` or the active profile
3. Environment variables
4. Default credentials file (`~/.ipb/.credentials.json`)

### Destructive operations and `--yes`

`deploy`, `publish`, `disable`, `transfer`, and `pay` change live card state or move money. Interactive runs ask for confirmation. Automation and pipes should pass `--yes` only when the action is intentional.

### Local `run` vs online `simulate`

- **`run`** uses the local emulator and local files/env—good for fast iteration offline.
- **`simulate`** hits Investec’s online simulator with your card/API context—closer to production behaviour, needs credentials.

### Agent / automation tip

Copyable skill for AI agents that operate `ipb`: [skills/ipb/](./skills/ipb/). Prefer `--json` and confirm money or deploy steps before running them.

---

## Contributing and development

Issues and pull requests are welcome. For running locally, tests, docs, **version bumps**, and releases, see **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

```sh
git clone https://github.com/devinpearson/ipb.git
cd ipb
npm install
npm run build
node bin/index.js --help
```

---

## License

MIT — see [LICENSE.md](LICENSE.md).

## Contact

Open a GitHub issue for questions and bugs.

## Acknowledgments

- [Commander](https://www.npmjs.com/package/commander), [Chalk](https://github.com/chalk/chalk), [Ora](https://github.com/sindresorhus/ora), [VHS](https://github.com/charmbracelet/vhs)
- [CLIG.dev](https://clig.dev/), [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [Investec Programmable Banking Community](https://developer.investec.com/za/community)
- [Divio documentation system](https://documentation.divio.com/)

## Related projects

- [Banking API Simulator](https://github.com/devinpearson/programmable-banking-sim)
- [Random Banking Data Generator](https://github.com/devinpearson/programmable-banking-faker)
- [Open Banking POS](https://github.com/devinpearson/programmable-banking-pos)
- [Card Issuer](https://github.com/devinpearson/programmable-banking-card-issuer)
- [Blockly editor for card code](https://github.com/devinpearson/investec-blockly)
- [HTTP server for card emulator](https://github.com/devinpearson/investec-card-server)
- [Card code emulator package](https://github.com/devinpearson/programmable-card-code-emulator)
