# IPB CLI Command Reference

> This documentation is auto-generated from the CLI command definitions.
> Last generated: 2026-03-24T17:50:02.946Z

## Table of Contents

- [cards](#cards-aliases-c)
- [config](#config-aliases-cfg)
- [deploy](#deploy-aliases-d)
- [logs](#logs-aliases-log)
- [run](#run-aliases-r)
- [fetch](#fetch-aliases-f)
- [upload](#upload-aliases-up)
- [env](#env)
- [env-list](#env-list)
- [upload-env](#upload-env)
- [published](#published)
- [publish](#publish-aliases-pub)
- [simulate](#simulate)
- [enable](#enable)
- [disable](#disable)
- [currencies](#currencies)
- [countries](#countries)
- [merchants](#merchants)
- [accounts](#accounts-aliases-acc)
- [balances](#balances-aliases-bal)
- [transfer](#transfer)
- [pay](#pay)
- [transactions](#transactions-aliases-tx)
- [beneficiaries](#beneficiaries)
- [new](#new)
- [completion](#completion)
- [docs](#docs)

## cards (aliases: c)

List all programmable cards. Shows card keys, numbers, and activation status for each card.

**Usage:** `ipb cards`


## config (aliases: cfg)

Configure authentication credentials. Set API keys, client credentials, and card keys for CLI operations. Supports configuration profiles for managing multiple environments.

**Usage:** `ipb config`

**Options:**

- `--card-key <cardKey>` (required) - Set your card key for the Investec API
- `--openai-key <openaiKey>` (required) - Set your OpenAI API key for AI code generation
- `--sandbox-key <sandboxKey>` (required) - Set your sandbox key for AI generation

**Subcommands:**

### profile

Manage configuration profiles

**Usage:** `ipb config profile`

**Subcommands:**

#### list (aliases: ls)

List all available configuration profiles

**Usage:** `ipb config profile list`

#### set

Set the active profile (used when --profile is not specified)

**Usage:** `ipb config profile set <profile>`

**Arguments:**

- `<profile>` (required) - Profile name to set as active

#### show

Show the currently active profile

**Usage:** `ipb config profile show`

#### delete (aliases: rm)

Delete a configuration profile

**Usage:** `ipb config profile delete <profile>`

**Arguments:**

- `<profile>` (required) - Profile name to delete

### edit

Open credentials file in your editor. Uses EDITOR environment variable or defaults to nano/vim/notepad.

**Usage:** `ipb config edit`


## deploy (aliases: d)

Deploy JavaScript code to a programmable card. Uploads code and optional environment variables, then publishes it to make it active.

**Usage:** `ipb deploy`

**Options:**

- `-f,--filename <filename>` (required) - JavaScript file to deploy
- `-e,--env <env>` (required) - Environment name (loads variables from .env.<env> file)
- `-c,--card-key <cardKey>` (required) - Card identifier to deploy to
- `--yes` - Skip confirmation prompt for destructive operations


## logs (aliases: log)

Fetch execution logs from a card. Retrieves transaction execution logs and saves them to a JSON file.

**Usage:** `ipb logs`

**Options:**

- `-f,--filename <filename>` (required) - Output filename for logs (JSON format)
- `-c,--card-key <cardKey>` (required) - Card identifier to fetch logs from


## run (aliases: r)

Run card code locally using the emulator. Test JavaScript code with simulated transactions without deploying to a card.

**Usage:** `ipb run`

**Options:**

- `-f,--filename <filename>` (required) - JavaScript file to execute
- `-e,--env <env>` (required) - Environment file to load (.env.<env>)
- `-a,--amount <amount>` (required) - Transaction amount in cents
- `-u,--currency <currency>` (required) - Currency code (ISO 4217)
- `-z,--mcc <mcc>` (required) - Merchant category code
- `-m,--merchant <merchant>` (required) - Merchant name
- `-i,--city <city>` (required) - Merchant city
- `-o,--country <country>` (required) - Country code (ISO 3166-1 alpha-2)


## fetch (aliases: f)

Fetch saved code from a card. Downloads the code currently saved on a card and saves it to a local file.

**Usage:** `ipb fetch`

**Options:**

- `-f,--filename <filename>` (required) - Local filename to save the code to
- `-c,--card-key <cardKey>` (required) - Card identifier to fetch code from


## upload (aliases: up)

Upload code to a card without publishing. Saves JavaScript code to a card but does not activate it. Use publish command to activate.

**Usage:** `ipb upload`

**Options:**

- `-f,--filename <filename>` (required) - JavaScript file to upload
- `-c,--card-key <cardKey>` (required) - Card identifier to upload code to


## env

Download environment variables from a card. Retrieves all environment variables configured on a card and saves them to a JSON file.

**Usage:** `ipb env`

**Options:**

- `-f,--filename <filename>` (required) - Output filename for environment variables (JSON format)
- `-c,--card-key <cardKey>` (required) - Card identifier to fetch environment from


## env-list

List all supported environment variables. Shows available environment variables with descriptions, usage examples, and default values.

**Usage:** `ipb env-list`


## upload-env

Upload environment variables to a card. Reads environment variables from a JSON file and uploads them to a card.

**Usage:** `ipb upload-env`

**Options:**

- `-f,--filename <filename>` (required) - JSON file containing environment variables
- `-c,--card-key <cardKey>` (required) - Card identifier to upload environment to


## published

Download the currently published code from a card. Retrieves the active code currently running on a card and saves it to a local file.

**Usage:** `ipb published`

**Options:**

- `-f,--filename <filename>` (required) - Local filename to save the published code to
- `-c,--card-key <cardKey>` (required) - Card identifier to fetch published code from


## publish (aliases: pub)

Publish previously uploaded code to make it active. Activates code that was uploaded using the upload command. Requires code ID from upload.

**Usage:** `ipb publish`

**Options:**

- `-f,--filename <filename>` (required) - JavaScript file to publish (must match uploaded code)
- `-i,--code-id <codeId>` (required) - Code ID from previous upload command
- `-c,--card-key <cardKey>` (required) - Card identifier to publish code to
- `--yes` - Skip confirmation prompt for destructive operations


## simulate

Test code using the online simulator. Runs JavaScript code in the Investec cloud environment with simulated transactions. Similar to run but uses cloud infrastructure.

**Usage:** `ipb simulate`

**Options:**

- `-f,--filename <filename>` (required) - JavaScript file to simulate (required)
- `-c,--card-key <cardKey>` (required) - Card identifier for simulation
- `-e,--env <env>` (required) - Environment name
- `-a,--amount <amount>` (required) - Transaction amount in cents
- `-u,--currency <currency>` (required) - Currency code (ISO 4217)
- `-z,--mcc <mcc>` (required) - Merchant category code
- `-m,--merchant <merchant>` (required) - Merchant name
- `-i,--city <city>` (required) - Merchant city
- `-o,--country <country>` (required) - Country code (ISO 3166-1 alpha-2)


## enable

Enable programmable code on a card. Activates programmable card functionality. Code must be deployed and published first.

**Usage:** `ipb enable`

**Options:**

- `-c,--card-key <cardKey>` (required) - Card identifier to enable code on


## disable

Disable programmable code on a card. Deactivates programmable card functionality. Code remains deployed but will not execute on transactions.

**Usage:** `ipb disable`

**Options:**

- `-c,--card-key <cardKey>` (required) - Card identifier to disable code on
- `--yes` - Skip confirmation prompt for destructive operations


## currencies

List all supported currency codes. Shows ISO 4217 currency codes and names available for use in transaction simulations and operations.

**Usage:** `ipb currencies`


## countries

List all supported country codes. Shows ISO 3166-1 alpha-2 country codes and names available for use in transaction simulations.

**Usage:** `ipb countries`


## merchants

List merchant categories and codes. Shows merchant category codes (MCC) with descriptions for use in transaction simulations.

**Usage:** `ipb merchants`


## accounts (aliases: acc)

List all Investec accounts. Shows account IDs, account numbers, product names, and reference names for all linked accounts.

**Usage:** `ipb accounts`


## balances (aliases: bal)

Get account balance information. Retrieves current balance, available balance, and budget balance for a specific account.

**Usage:** `ipb balances <accountId>`

**Arguments:**

- `<accountId>` (required) - Account ID to fetch balances for


## transfer

Transfer money between your own accounts. Moves funds from one account to another. Prompts interactively for missing information.

**Usage:** `ipb transfer <accountId> <beneficiaryAccountId> <amount> <reference>`

**Arguments:**

- `<accountId>` (required) - Account ID to transfer from
- `<beneficiaryAccountId>` (required) - Beneficiary account ID to transfer to
- `<amount>` (required) - Amount to transfer in rands (e.g. 100.00)
- `<reference>` (required) - Payment reference message

**Options:**

- `--yes` - Skip confirmation prompt for destructive operations


## pay

Pay a beneficiary from your account. Makes a payment to a registered beneficiary. Requires confirmation before executing.

**Usage:** `ipb pay <accountId> <beneficiaryId> <amount> <reference>`

**Arguments:**

- `<accountId>` (required) - Account ID to pay from
- `<beneficiaryId>` (required) - Beneficiary ID to pay to
- `<amount>` (required) - Amount to pay in rands (e.g. 100.00)
- `<reference>` (required) - Payment reference message

**Options:**

- `--yes` - Skip confirmation prompt for destructive operations


## transactions (aliases: tx)

Get transaction history for an account. Retrieves and displays recent transactions with full details including amounts, dates, and merchants.

**Usage:** `ipb transactions <accountId>`

**Arguments:**

- `<accountId>` (required) - Account ID to fetch transactions for


## beneficiaries

List all beneficiaries. Shows all registered beneficiaries linked to your Investec profile with their IDs and details.

**Usage:** `ipb beneficiaries`


## new

Create a new project with scaffolding. Generates a new project directory with template files and directory structure for card code development.

**Usage:** `ipb new <name>`

**Arguments:**

- `<name>` (required) - Project name (will create a directory with this name)

**Options:**

- `--force` - Overwrite existing project directory if it exists
- `--template <template>` (required) - Template to use for project structure


## completion

Generate shell completion script. Creates autocomplete scripts for bash or zsh to enable tab completion for commands and options.

**Usage:** `ipb completion <shell>`

**Arguments:**

- `<shell>` (required) - Shell type (bash or zsh)


## docs

Generate command documentation. Creates markdown documentation from CLI command definitions and writes it to GENERATED_README.md.

**Usage:** `ipb docs`


## Global Options

These options are available for all commands:

- `-V, --version` - output the version number
- `--check-updates` - Check for available updates
- `--no-history` - Disable command history logging
