# Investec Programmable Banking CLI

Allows you to deploy your code directly to your card. It also includes an emulator to test your code locally.

---

## 🌟 Community-Powered Repository 🌟

This repository is crafted with ❤️ by our talented community members. It's a space for everyone to use, contribute to, and share. While it aligns with the spirit of our community, please note that this repo is not directly endorsed or supported by Investec. Always exercise caution and discretion when using or contributing to community-driven projects.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  
![NPM Version](https://img.shields.io/npm/v/investec-ipb)

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Configuration Profiles](#configuration-profiles)
- [Usage](#usage)
  - [Confirmation for Destructive Operations](#confirmation-for-destructive-operations)
  - [Cards](#cards)
  - [Deploy](#deploy)
  - [Fetching Execution Logs](#fetching-execution-logs)
  - [Run - Local Simulation](#run---local-simulation)
  - [New Project](#new-project)
  - [Enable and Disable Code](#enable-and-disable-code)
  - [Countries](#countries)
  - [Currencies](#currencies)
  - [Merchants](#merchants)
  - [Fetch Code](#fetch-code)
  - [Upload Code](#upload-code)
  - [Fetch Environment Variables](#fetch-environment-variables)
  - [Upload Environment Variables](#upload-environment-variables)
  - [Fetch Published Code](#fetch-published-code)
  - [Publish Code](#publish-code)
  - [Simulate Code](#simulate-code)
  - [Accounts](#accounts)
  - [Balances](#balances)
  - [Transfer](#transfer)
  - [Pay](#pay)
  - [Transactions](#transactions)
  - [Beneficiaries](#beneficiaries)
- [Config](#config)
- [Error Codes](#error-codes)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)
- [Related Projects](#related-projects)

---

## Installation

### npm (Recommended - requires Node.js)

Before installing, [download and install Node.js](https://nodejs.org/en/download/) (version 24 or higher).

To install or upgrade the CLI, run the following command:

```sh
npm install -g investec-ipb
```

On Windows, you may need to set your execution policy to allow running scripts. You can do this by running the following command in PowerShell as an administrator:

```sh
Set-ExecutionPolicy Unrestricted -Scope CurrentUser
```

### Homebrew (macOS/Linux - no Node.js required)

Install via Homebrew for a standalone binary (no Node.js installation needed):

```sh
brew tap devinpearson/ipb
brew install ipb
```

Or install directly:

```sh
brew install devinpearson/ipb/ipb
```

### Direct Download (no Node.js required)

Download pre-built binaries from [GitHub Releases](https://github.com/devinpearson/ipb/releases).

**macOS:**

```sh
# Apple Silicon (M1/M2/M3)
curl -L https://github.com/devinpearson/ipb/releases/download/v0.8.3/ipb-macos-arm64 -o ipb
chmod +x ipb
sudo mv ipb /usr/local/bin/

# Intel
curl -L https://github.com/devinpearson/ipb/releases/download/v0.8.3/ipb-macos-x64 -o ipb
chmod +x ipb
sudo mv ipb /usr/local/bin/
```

**Linux:**

**Ubuntu/Debian (.deb package):**

```sh
# Download .deb package
wget https://github.com/devinpearson/ipb/releases/download/v0.8.3/ipb_0.8.3_amd64.deb

# Install
sudo dpkg -i ipb_0.8.3_amd64.deb
sudo apt-get install -f  # Install dependencies if needed
```

**Direct Binary:**

```sh
# x64
curl -L https://github.com/devinpearson/ipb/releases/download/v0.8.3/ipb-linux-x64 -o ipb
chmod +x ipb
sudo mv ipb /usr/local/bin/

# ARM64
curl -L https://github.com/devinpearson/ipb/releases/download/v0.8.3/ipb-linux-arm64 -o ipb
chmod +x ipb
sudo mv ipb /usr/local/bin/
```

**Ubuntu PPA (if available):**

```sh
sudo add-apt-repository ppa:your-launchpad-id/ipb
sudo apt update
sudo apt install ipb
```

**Windows:**
Download `ipb-win-x64.exe` from the [releases page](https://github.com/devinpearson/ipb/releases), rename it to `ipb.exe`, and add it to your PATH.

For more distribution options, see [DISTRIBUTION.md](./DISTRIBUTION.md).

### Shell Autocomplete

The CLI supports shell autocomplete for bash and zsh, making it easier to discover commands and options.

**Bash:**

```sh
# Install for all users (requires sudo)
sudo ipb completion bash > /etc/bash_completion.d/ipb

# Or install for current user only
mkdir -p ~/.bash_completion.d
ipb completion bash > ~/.bash_completion.d/ipb
echo "source ~/.bash_completion.d/ipb" >> ~/.bashrc

# For current session only
source <(ipb completion bash)
```

**Zsh:**

```sh
# Install completion script
mkdir -p ~/.zsh/completions
ipb completion zsh > ~/.zsh/completions/_ipb

# Add to ~/.zshrc
fpath=(~/.zsh/completions $fpath)
autoload -U compinit && compinit
```

After installation, restart your terminal or source your shell configuration file. You can then use `Tab` to autocomplete commands, options, and file paths.

---

## Configuration

You can access your client ID, client secret, and API key from the Investec Developer Portal. More information on how to access your keys can be found on the [Investec Developer Community Wiki](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-api-keys).

To configure the CLI, run the following command:

```sh
ipb config --client-id <client-id> --client-secret <client-secret> --api-key <api-key>
```

**⚠️ Security Note:** While the CLI supports environment variables, it's recommended to use credential files for secrets (see [Security Best Practices](#security-best-practices) below). Environment variables can be leaked in process lists, logs, and CI/CD configurations.

If you want to set up specific environments for your code, you can set the environment variables in a `.env` file in the root of your project:

```env
INVESTEC_HOST=https://openapi.investec.com
INVESTEC_CLIENT_ID=your-client-id
# ⚠️ SECURITY WARNING: Secrets in .env files can be leaked
# Consider using credential files instead: ipb config --client-secret <secret> --api-key <key>
INVESTEC_CLIENT_SECRET=your-client-secret
INVESTEC_API_KEY=your-api-key
```

### Environment Variables

The CLI supports several environment variables that can be set in your shell or `.env` file. To see all supported environment variables with detailed descriptions, run:

```sh
ipb env-list
```

This command displays:

- **API Credentials**: `INVESTEC_HOST`, `INVESTEC_CLIENT_ID`, `INVESTEC_CLIENT_SECRET`, `INVESTEC_API_KEY`, `INVESTEC_CARD_KEY`
- **Development**: `DEBUG`
- **Security**: `REJECT_UNAUTHORIZED`

#### Standard CLI Environment Variables

The CLI follows standard CLI conventions and respects these environment variables:

- **`NO_COLOR`**: Disable colored output. Set to any value to disable colors.

  ```sh
  NO_COLOR=1 ipb accounts
  ```

- **`FORCE_COLOR`**: Force colored output even when piping. Set to any value to enable colors.

  ```sh
  FORCE_COLOR=1 ipb accounts | cat
  ```

- **`DEBUG`**: Enable verbose/debug output. Set to any value to enable verbose mode (equivalent to `--verbose` flag).

  ```sh
  DEBUG=1 ipb accounts
  # Or
  DEBUG=true ipb deploy -f main.js
  ```

- **`PAGER`**: Specify pager for long output. Defaults to `less` if not set.

  ```sh
  PAGER=more ipb transactions <accountId>
  ```

- **`LINES`** and **`COLUMNS`**: Terminal dimensions for table formatting (automatically detected if not set).

- **`TMPDIR`**: Temporary directory for temporary files. Defaults to system temp directory (`/tmp` on Unix, `%TEMP%` on Windows) if not set.

  ```sh
  TMPDIR=/custom/tmp ipb <command>
  ```

  Note: The CLI uses Node.js `os.tmpdir()` which automatically respects `TMPDIR`. Atomic file operations (like credential writes) use the same directory as the target file to ensure atomicity.

- **`EDITOR`**: Editor to use for editing configuration files. Defaults to `nano` on Unix, `notepad.exe` on Windows.

  ```sh
  EDITOR=vim ipb config edit
  EDITOR="code --wait" ipb config edit  # VS Code
  ```

  Used by `ipb config edit` command to open credentials files in your preferred editor.

- **`TERM`**: Terminal type for capability detection. The CLI automatically detects terminal capabilities and falls back to ASCII alternatives when Unicode/emoji are not supported.

  ```sh
  TERM=dumb ipb accounts  # Uses ASCII fallbacks
  TERM=xterm-256color ipb accounts  # Uses emojis if supported
  ```

  The CLI checks `TERM`, `TERMINFO`, and `TERMCAP` environment variables to determine if the terminal supports Unicode and emoji characters. Emojis are automatically replaced with ASCII equivalents (e.g., `💳` → `[CARD]`) when the terminal doesn't support them.

You can also get structured output:

```sh
ipb env-list --json
ipb env-list --yaml --output env-vars.yaml
```

### Security Best Practices

#### ⚠️ Important: Secret Handling

For security reasons, the CLI **recommends storing secrets in credential files rather than environment variables**. While the CLI supports environment variables for convenience, they pose security risks:

**Why credential files are more secure:**

- Environment variables can be leaked in:
  - Process lists (`ps`, `top`, `htop`)
  - System logs
  - CI/CD configuration files (GitHub Actions, GitLab CI, etc.)
  - Shell history files
  - Debug output and error messages
- Credential files are stored with restricted permissions (`600`) and in a secure location (`~/.ipb/.credentials.json`)

**The CLI will automatically warn you if:**

- Secrets are detected in environment variables AND
- You're running in verbose mode (`--verbose` or `DEBUG=1`) OR
- You're in a non-interactive environment (CI/CD, scripts, etc.)

**Recommended approach:**

```sh
# Store secrets in credential files (recommended)
ipb config --client-id <id> --client-secret <secret> --api-key <key>

# Or use profiles for multiple environments
ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>
ipb config --profile staging --client-id <id> --client-secret <secret> --api-key <key>
ipb config profile set production  # Set active profile
```

**When environment variables are acceptable:**

- Development/testing environments (with awareness of risks)
- Temporary use cases where credential files are not practical
- When you understand the security implications

**Note:** The CLI still supports environment variables for backward compatibility, but you should be aware of the security implications. The CLI follows [clig.dev](https://clig.dev/) guidelines which recommend against reading secrets from environment variables.

**Priority Order** (highest to lowest):

1. Command line options (e.g., `--client-id`, `--api-key`)
2. Configuration profile (if `--profile` is specified or active profile is set)
3. Environment variables
4. Credentials file (`~/.ipb/.credentials.json`)

You also have the option to specify the host, client ID, client secret, API key, and card ID when calling each command. These will override the configuration set in the `.env` file and your credential file:

```sh
ipb deploy -f <filename> -e <environment> -c <card-id> --host <host> --client-id <client-id> --client-secret <client-secret> --api-key <api-key>
```

You can also create your own `.credentials.json` file and store and access it in a location you prefer. This file should be in the following format:

```json
{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "api_key": "your-api-key",
  "card_id": "your-card-id"
}
```

To configure the CLI using a credentials file, run the following command:

```sh
ipb cards --credentials-file <path-to-credentials-file>
```

The card ID is optional and can be set when calling each command. If you specify a card when calling a command, it will override the card ID set in the configuration.

### Configuration Profiles

The CLI supports multiple configuration profiles, making it easy to switch between different environments (production, staging, development, etc.) without manually changing credentials.

**Creating Profiles:**

Save credentials to a specific profile:

```sh
# Create a production profile
ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>

# Create a staging profile
ipb config --profile staging --client-id <id> --client-secret <secret> --api-key <key>

# Update an existing profile (adds or updates only the specified fields)
ipb config --profile production --card-key <card-key>
```

**Using Profiles:**

Use a profile with any command using the `--profile` option:

```sh
# Deploy to production
ipb deploy --profile production -f main.js -c card-123

# List cards from staging
ipb cards --profile staging

# Check balances using a specific profile
ipb balances acc-123 --profile production
```

**Managing Profiles:**

List all available profiles:

```sh
ipb config profile list
```

This shows all profiles with the active profile marked:

```text
Available profiles:
  - development
  - production (active)
  - staging
```

Set a default active profile (used when `--profile` is not specified):

```sh
ipb config profile set production
```

Show the currently active profile:

```sh
ipb config profile show
```

Delete a profile:

```sh
ipb config profile delete staging
```

**Profile Storage:**

- Profiles are stored in `~/.ipb/profiles/<profile-name>.json`
- The active profile is stored in `~/.ipb/active-profile.json`
- All profile files use secure permissions (read/write for owner only)
- Profiles can contain: `clientId`, `clientSecret`, `apiKey`, `cardKey`, `host`

**Profile Priority:**

When using `--profile`, the profile credentials are loaded first, then command-line options override specific values:

```sh
# Profile credentials are loaded, but --api-key overrides the profile's API key
ipb deploy --profile production --api-key different-key -f main.js
```

**Example Workflow:**

```sh
# 1. Set up profiles for different environments
ipb config --profile production --client-id prod-id --client-secret prod-secret --api-key prod-key
ipb config --profile staging --client-id stage-id --client-secret stage-secret --api-key stage-key

# 2. Set production as default
ipb config profile set production

# 3. Use default profile (production)
ipb deploy -f main.js -c card-123

# 4. Use staging profile explicitly
ipb deploy --profile staging -f main.js -c card-456

# 5. Override a specific credential
ipb deploy --profile production --card-key different-card -f main.js
```

---

## Usage

### Confirmation for Destructive Operations

Several commands that perform destructive operations (deploy, publish, disable, transfer, pay) require interactive confirmation before execution. This helps prevent accidental operations that could affect your code or financial transactions.

**Commands requiring confirmation:**

- `deploy` - Overwrites existing code on a card
- `publish` - Activates code on a card
- `disable` - Deactivates code on a card
- `transfer` - Transfers money between accounts
- `pay` - Makes a payment to a beneficiary

**Skip confirmation with `--yes` flag:**

For automation and CI/CD pipelines, you can use the `--yes` flag to skip confirmation prompts:

```sh
ipb deploy -f main.js -c card-123 --yes
ipb publish -f app.js --code-id code-123 -c card-456 --yes
ipb transfer acc-123 acc-456 100.50 "Payment" --yes
ipb pay acc-123 ben-456 250.00 "Payment" --yes
ipb disable -c card-123 --yes
```

**Note:** In non-interactive environments (when output is piped), the `--yes` flag is required for destructive operations to proceed.

### Cards

To get a list of your cards with card keys, card number, and whether the card is enabled for card code, run the following command:

```sh
ipb cards
```

This command retrieves detailed information about your cards, including their unique identifiers and status. It is useful for managing multiple cards and ensuring the correct card is targeted for operations.

![cards command](assets/cards.gif)

### Deploy

Deploy your code directly to your card. This command allows you to specify environment variables and target a specific card for deployment. For environment variables, you can set them in a `.env` file in the root of your project. Name your environments such as `.env.prod` or `.env.dev` and specify the environment when running the command.

**⚠️ This command requires confirmation** as it will overwrite any existing code on the card.

To deploy code to your card, run the following command:

```sh
ipb deploy -f <filename> -e <environment> -c <card-id>
```

You will be prompted to confirm before the deployment proceeds. To skip the confirmation prompt (useful for automation), use the `--yes` flag:

```sh
ipb deploy -f <filename> -e <environment> -c <card-id> --yes
```

This command ensures that your code is uploaded securely to the specified card. It also supports environment-specific configurations to avoid accidental uploads of sensitive data.

![deploy command](assets/deploy.gif)

### Fetching Execution Logs

Fetch execution logs and save them to a file. The output is in JSON format, and the file will be overwritten if it already exists. This command is essential for debugging and monitoring the behavior of your deployed code.

To fetch execution logs, run the following command:

```sh
ipb logs -f <filename> -c <card-id>
```

This command retrieves logs for the specified card and saves them to the provided filename, such as `executions.json` or `logs.json`. It helps you analyze the execution flow and identify any issues.

![logs command](assets/logs.gif)

### Run - Local Simulation

Simulate your code locally by specifying transaction details as arguments. The amount is in cents, and the currency is the ISO 4217 currency code. This command does not require an Investec account or API keys, as it runs entirely locally.

To run a transaction against your local files, use the following command:

```sh
ipb run -f main.js -e prod --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```

This command is ideal for testing your code in a controlled environment before deploying it to a card. It provides detailed logs of the transaction and execution process.

![run command](assets/run.gif)

### New Project

To scaffold a new project, run the following command:

```sh
ipb new <project-name> --template <template-name>
```

The `template` option is optional and can be set to `default` or `petro` to create a project using one of the predefined templates. This command helps you quickly set up a project structure tailored to your needs.

![new command](assets/new.gif)

### Enable and Disable Code

To enable or disable code on your card, use the following commands:

Enable code:

```sh
ipb enable -c <card-id>
```

Disable code:

**⚠️ This command requires confirmation** as it will deactivate the programmable code on your card.

```sh
ipb disable -c <card-id>
```

You will be prompted to confirm before disabling the code. To skip the confirmation prompt, use the `--yes` flag:

```sh
ipb disable -c <card-id> --yes
```

These commands allow you to control whether the programmable code is active on your card. This is useful for testing or temporarily disabling functionality.

![toggle command](assets/toggle.gif)

### Countries

Retrieve a list of countries that can be used in the card code:

```sh
ipb countries
```

This command provides a list of supported countries, which can be useful for setting up transactions or merchant details.

### Currencies

Retrieve a list of currencies that can be used in the card code:

```sh
ipb currencies
```

This command provides a list of supported currencies, including their ISO 4217 codes, for use in transactions.

### Merchants

Retrieve a list of merchants that can be used in the card code:

```sh
ipb merchants
```

This command provides merchant details, such as names and categories, to help you simulate or configure transactions.

### Fetch Code

To fetch the code saved on the card, run the following command:

```sh
ipb fetch -f <filename> -c <card-id>
```

This command downloads the code currently saved on the card to a local file for review or backup.

![fetch command](assets/fetch.gif)

### Upload Code

To upload code to the card's saved code, run the following command:

```sh
ipb upload -f <filename> -c <card-id>
```

This command uploads your code to the card, making it available for execution.

![upload command](assets/upload.gif)

### Fetch Environment Variables

To fetch the environment variables saved on the card, run the following command:

```sh
ipb env -f <filename> -c <card-id>
```

This command downloads the environment variables from the card to a local file for review or modification.

![env command](assets/env.gif)

### Upload Environment Variables

To upload environment variables to the card, run the following command:

```sh
ipb upload-env -f <filename> -c <card-id>
```

This command uploads environment variables to the card, allowing you to configure its runtime environment.

![upload-env command](assets/upload-env.gif)

### Fetch Published Code

To fetch the published code saved on the card, run the following command:

```sh
ipb published -f <filename> -c <card-id>
```

This command downloads the published version of the code from the card to a local file.

![published command](assets/published.gif)

### Publish Code

To publish code to the card, you will need the `codeId` returned when saving the code using the upload command.

**⚠️ This command requires confirmation** as it will activate the code on your card.

Run the following command:

```sh
ipb publish -f <filename> --code-id <code-id> -c <card-id>
```

You will be prompted to confirm before publishing. To skip the confirmation prompt, use the `--yes` flag:

```sh
ipb publish -f <filename> --code-id <code-id> -c <card-id> --yes
```

This command publishes the uploaded code, making it the active version on the card.

![publish command](assets/publish.gif)

### Simulate Code

Use the online simulator to test your code without deploying it to the card. This is similar to the `run` command but uses the online simulator instead of the local emulator. Be aware that it will use your online environment and not your local environment.

```sh
ipb simulate -f main.js -c <card-key> --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```

This command is ideal for testing your code in a production-like environment before deploying it to the card.

![simulate command](assets/simulate.gif)

### Accounts

Get a list of your accounts:

```sh
ipb accounts
```

This command retrieves all your Investec accounts linked to your credentials.

### Balances

Get balances for a specific account:

```sh
ipb balances <accountId>
```

This command fetches the balance for the given account ID.

### Transfer

Transfer between your accounts:

**⚠️ This command requires confirmation** as it will transfer money between your accounts.

```sh
ipb transfer <accountId> <beneficiaryAccountId> <amount> <reference>
```

A summary of the transfer will be displayed, and you will be prompted to confirm before proceeding. To skip the confirmation prompt, use the `--yes` flag:

```sh
ipb transfer <accountId> <beneficiaryAccountId> <amount> <reference> --yes
```

Transfers the specified amount (in rands, e.g. 100.00) from one account to another with a reference.

### Pay

Pay a beneficiary from your account:

**⚠️ This command requires confirmation** as it will make a payment from your account.

```sh
ipb pay <accountId> <beneficiaryId> <amount> <reference>
```

A summary of the payment will be displayed, and you will be prompted to confirm before proceeding. To skip the confirmation prompt, use the `--yes` flag:

```sh
ipb pay <accountId> <beneficiaryId> <amount> <reference> --yes
```

Pays a beneficiary from your account with the specified amount and reference.

### Transactions

Get transactions for a specific account:

```sh
ipb transactions <accountId>
```

Fetches the transaction history for the given account ID.

### Beneficiaries

Get your list of beneficiaries:

```sh
ipb beneficiaries
```

Lists all beneficiaries linked to your Investec profile.

### Config

Set authentication credentials for the CLI:

```sh
# Save to default credentials
ipb config --client-id <client-id> --client-secret <client-secret> --api-key <api-key>

# Save to a profile
ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>
```

You can also set **card key** and **host** on the credentials record using additional options (see `ipb config --help`).

**Profile Management:**

The `config` command also supports managing configuration profiles:

```sh
# List all profiles
ipb config profile list

# Set active profile
ipb config profile set production

# Show active profile
ipb config profile show

# Delete a profile
ipb config profile delete staging

# Edit credentials in your editor
ipb config edit
ipb config edit --profile production
```

**Editing Credentials:**

You can edit credentials files directly in your preferred editor using the `edit` subcommand:

```sh
# Edit default credentials
ipb config edit

# Edit a specific profile
ipb config edit --profile production
```

The command respects the `EDITOR` environment variable. If not set, it defaults to `nano` on Unix systems and `notepad.exe` on Windows.

```sh
# Use a specific editor
EDITOR=vim ipb config edit
EDITOR="code --wait" ipb config edit  # VS Code
```

For more details, see the [Configuration Profiles](#configuration-profiles) section above.

---

## Exit Codes

The CLI uses specific exit codes to indicate different types of errors, making it easier to handle errors in scripts and automation. All commands exit with code `0` on success.

### Exit Code Reference

| Exit Code | Meaning | Description |
|------------|---------|-------------|
| `0` | Success | Command completed successfully |
| `1` | General Error | Generic error that doesn't fit other categories |
| `2` | Validation Error | Invalid input, missing required fields, or invalid arguments |
| `3` | Authentication Error | Invalid or missing credentials, authentication failures |
| `4` | File Error | File not found, file system errors, template issues |
| `5` | API Error | API request failures, server errors (5xx), deployment failures |
| `6` | Network Error | Network connection issues, timeouts, DNS failures |
| `7` | Permission Error | File permission errors, access denied |

### Examples

```bash
# Success - exits with code 0
ipb cards
echo $?  # Output: 0

# Validation error - exits with code 2
ipb deploy -f missing.js
echo $?  # Output: 2

# Authentication error - exits with code 3
ipb accounts  # With invalid credentials
echo $?  # Output: 3

# File error - exits with code 4
ipb deploy -f nonexistent.js
echo $?  # Output: 4
```

### Using Exit Codes in Scripts

You can use exit codes in shell scripts to handle different error types:

```bash
#!/bin/bash

if ipb deploy -f main.js; then
  echo "Deployment successful!"
else
  exit_code=$?
  case $exit_code in
    2) echo "Validation error - check your input" ;;
    3) echo "Authentication error - check your credentials" ;;
    4) echo "File error - check file paths" ;;
    5) echo "API error - check API status" ;;
    6) echo "Network error - check your connection" ;;
    7) echo "Permission error - check file permissions" ;;
    *) echo "Unknown error (code: $exit_code)" ;;
  esac
  exit $exit_code
fi
```

---

## Error Codes

The CLI uses standardized error codes to help identify and troubleshoot issues. When an error occurs, you'll see a message in the format: `Error (E####): [message]`

### Error Code Reference

| Code | Description |
|------|-------------|
| `E4002` | Missing API Token - The API token is required but was not provided |
| `E4003` | Missing Card Key - The card key is required but was not provided |
| `E4004` | Missing Environment File - The specified environment file does not exist |
| `E4005` | Invalid Credentials - The provided credentials are invalid or authentication failed |
| `E4007` | Template Not Found - The specified template does not exist |
| `E4008` | Invalid Project Name - The project name contains invalid characters |
| `E4009` | Project Exists - A project with the specified name already exists |
| `E4010` | File Not Found - The specified file does not exist |
| `E4012` | Missing Account ID - The account ID is required but was not provided |
| `E5001` | Deploy Failed - Code deployment or API operation failed |

### Understanding Error Messages

Error messages are displayed in the following format:

```text
Error (E4003): card-key is required
```

- The error code (e.g., `E4003`) helps identify the type of error
- The message provides context-specific information about what went wrong
- Use the `--verbose` flag to get additional debugging information

### Common Error Scenarios

#### Missing Card Key (E4003)

- **Cause**: No card key provided via CLI option or credentials file
- **Solution**: Provide the card key using `-c <card-key>` or set it in your credentials file

#### Missing Environment File (E4004)

- **Cause**: The specified `.env.<environment>` file does not exist
- **Solution**: Create the environment file or use a different environment name

#### Invalid Credentials (E4005)

- **Cause**: API credentials are incorrect or expired
- **Solution**: Verify your credentials using `ipb config` or check your API keys in the Investec Developer Portal

#### File Not Found (E4010)

- **Cause**: The specified file path does not exist
- **Solution**: Verify the file path and ensure the file exists before running the command

---

## Development

For development on this library, clone the repository and run the following commands:

```sh
git clone https://github.com/devinpearson/ipb.git
cd ipb
```

```sh
npm install
```

To run the CLI during development, run the following command:

```sh
node . [command]
```

### Building

To build the project:

```sh
npm run build
```

This compiles TypeScript to JavaScript and copies necessary files to the `bin/` directory.

### Linting and Formatting

The project uses Biome for linting and formatting:

```sh
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Type Checking

To verify TypeScript types:

```sh
npm run type-check
```

---

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. The test suite includes comprehensive coverage of command functionality, error handling, and utility functions.

### Running Tests

Run all tests:

```sh
npm test
```

Run tests in watch mode (for development):

```sh
npm run dev
```

Run tests once and exit:

```sh
npm test -- --run
```

Run tests with coverage:

```sh
npm test -- --coverage
```

### Test Structure

Tests are organized in the `test/` directory:

```text
test/
├── cmds/              # One file per command area (e.g. deploy.test.ts)
├── utils/             # Utility and integration-style unit tests
├── __mocks__/
└── helpers.ts
```

### Test Patterns

Tests follow consistent patterns for mocking and assertions:

#### Mocking ESM Modules

For ESM modules like `node:fs`, use `vi.hoisted()` to create mocks:

```typescript
const mockFsPromises = vi.hoisted(() => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {},
  promises: mockFsPromises,
}));
```

#### Testing Error Propagation

Since commands use centralized error handling, tests verify errors propagate correctly:

```typescript
it('should propagate errors', async () => {
  const error = new Error('API error');
  mockApi.getCards.mockRejectedValue(error);
  
  await expect(cardsCommand(options)).rejects.toThrow('API error');
});
```

#### Testing Command Context

Error context is automatically attached via `withCommandContext`. Tests verify error messages include the command name:

```typescript
// Error messages will be: "Failed to cards command: <error>"
```

### Writing New Tests

When adding tests for new commands:

1. **Create test file** in `test/cmds/` following the naming pattern: `<command>.test.ts`

2. **Set up mocks**:

   ```typescript
   vi.mock('../../src/index.ts', () => ({
     credentials: {},
     printTitleBox: vi.fn(),
     optionCredentials: vi.fn(async (options, credentials) => credentials),
   }));
   
   vi.mock('../../src/utils.ts', async () => {
     const actual = await vi.importActual('../../src/utils.ts');
     return {
       ...actual,
       initializeApi: vi.fn(),
       // ... other mocked utilities
     };
   });
   ```

3. **Test success cases**: Verify command executes correctly with valid inputs

4. **Test error cases**: Verify errors propagate correctly (no try-catch in commands)

5. **Test edge cases**: Missing files, invalid inputs, API failures

### Test coverage

- Run the suite with `npm run test:run` (Vitest). Tests live under `test/cmds/` and `test/utils/`.
- When adding a command, add a matching `test/cmds/<command>.test.ts` and follow the mocking patterns above (`vi.importActual` for `utils.ts`, mock `index.ts` credentials where needed).

---

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

## Contact

For inquiries, please open an issue.

---

## Acknowledgments

- [Commander](https://www.npmjs.com/package/commander)
- [Chalk](https://github.com/chalk/chalk)
- [VHS](https://github.com/charmbracelet/vhs)
- [Ora](https://github.com/sindresorhus/ora)
- [NodeJS CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [CLIG.dev - Command Line Interface Guidelines](https://clig.dev/)
- [Investec Programmable Banking Community](https://developer.investec.com/za/community)

---

## Related Projects

Here are some related projects that complement the Investec Programmable Banking CLI:

1. **[Banking API Simulator](https://github.com/devinpearson/programmable-banking-sim)**  
   A simulator for testing banking APIs in a controlled environment.

2. **[Random Banking Data Generator](https://github.com/devinpearson/programmable-banking-faker)**  
   A tool for generating random banking data for testing and development purposes.

3. **[Open Banking Point of Sales Device](https://github.com/devinpearson/programmable-banking-pos)**  
   A project for creating a point-of-sale device using open banking APIs.

4. **[Card Issuer](https://github.com/devinpearson/programmable-banking-card-issuer)**  
   A tool for issuing programmable banking cards.

5. **[Blockly Editor for Card Code](https://github.com/devinpearson/investec-blockly)**  
   A visual programming editor for creating card code using Blockly.

6. **[HTTP Server for Card Code Emulator](https://github.com/devinpearson/investec-card-server)**  
   A server for running the card code emulator over HTTP.

7. **[Card Code Emulator Package](https://github.com/devinpearson/programmable-card-code-emulator)**  
   A library for emulating programmable card code.
