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
- [Usage](#usage)
  - [Cards](#cards)
  - [Deploy](#deploy)
  - [Fetching Execution Logs](#fetching-execution-logs)
  - [Run - Local Simulation](#run---local-simulation)
  - [New Project](#new-project)
  - [Enable and Disable Code](#enable-and-disable-code)
  - [AI Generation](#ai-generation)
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
- [Bank](#bank)
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

Before installing, [download and install Node.js](https://nodejs.org/en/download/).

To install or upgrade the CLI, run the following command:

```sh
npm install -g investec-ipb
```

On Windows, you may need to set your execution policy to allow running scripts. You can do this by running the following command in PowerShell as an administrator:

```sh
Set-ExecutionPolicy Unrestricted -Scope CurrentUser
```

---

## Configuration

You can access your client ID, client secret, and API key from the Investec Developer Portal. More information on how to access your keys can be found on the [Investec Developer Community Wiki](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-api-keys).

To configure the CLI, run the following command:

```sh
ipb config --client-id <client-id> --client-secret <client-secret> --api-key <api-key>
```

If you want to set up specific environments for your code, you can set the environment variables in a `.env` file in the root of your project:

```env
INVESTEC_HOST=https://openapi.investec.com
INVESTEC_CLIENT_ID=your-client-id
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
- **AI Generation**: `OPENAI_API_KEY`, `SANDBOX_KEY`
- **Development**: `DEBUG`
- **Security**: `REJECT_UNAUTHORIZED`

You can also get structured output:
```sh
ipb env-list --json
ipb env-list --yaml --output env-vars.yaml
```

**Priority Order** (highest to lowest):
1. Command line options (e.g., `--client-id`, `--api-key`)
2. Environment variables
3. Credentials file (`~/.ipb/credentials.json`)

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

---

## Usage

### Cards

To get a list of your cards with card keys, card number, and whether the card is enabled for card code, run the following command:

```sh
ipb cards
```

This command retrieves detailed information about your cards, including their unique identifiers and status. It is useful for managing multiple cards and ensuring the correct card is targeted for operations.

![cards command](assets/cards.gif)

### Deploy

Deploy your code directly to your card. This command allows you to specify environment variables and target a specific card for deployment. For environment variables, you can set them in a `.env` file in the root of your project. Name your environments such as `.env.prod` or `.env.dev` and specify the environment when running the command.

To deploy code to your card, run the following command:

```sh
ipb deploy -f <filename> -e <environment> -c <card-id>
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

```sh
ipb disable -c <card-id>
```

These commands allow you to control whether the programmable code is active on your card. This is useful for testing or temporarily disabling functionality.

![toggle command](assets/toggle.gif)

### AI Generation

Generate code for your card using AI. This feature requires an OpenAI API key, which can be set in your environment variables or a `.env` file in the root of your project.

To generate code, run the following command:

```sh
ipb ai <prompt>
```

The generated code will be saved to a file called `ai-generated.js` in the current directory. If any environment variables are required, they will be saved to a file called `.env.ai`. You can then run or deploy the generated code.

You can use my OpenAI connection to test out the AI generation by registering with the following command:

```sh
ipb register -e <email> -p <password>
```

This will create an account on ipb.sanboxpay.co.za. You will need to message in the programmable banking community to get your account activated. Channel: `#12_sandbox-playground` with your email address. Calls to the service will be logged and monitored for abuse. You will be able to use the AI generation without needing to set up your own OpenAI API key.

You will then be able to log in using the following command:

```sh
ipb login -e <email> -p <password>
```

You can now use the AI generation command to generate code for your card.

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

To publish code to the card, you will need the `codeId` returned when saving the code using the upload command. Run the following command:

```sh
ipb publish -f <filename> --code-id <code-id> -c <card-id>
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

```sh
ipb transfer <accountId> <beneficiaryAccountId> <amount> <reference>
```

Transfers the specified amount (in rands, e.g. 100.00) from one account to another with a reference.

### Pay

Pay a beneficiary from your account:

```sh
ipb pay <accountId> <beneficiaryId> <amount> <reference>
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
ipb config --client-id <client-id> --client-secret <client-secret> --api-key <api-key>
```

You can also set card key, OpenAI key, and sandbox key using additional options.

### Bank

Use the LLM to call your bank with a natural language prompt:

```sh
ipb bank "Show me my last 5 transactions"
```

This command uses AI to interpret your prompt and interact with your bank data.

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
| `E4011` | Missing Email or Password - Email and password are required for authentication |
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
├── cmds/              # Command-specific tests
│   ├── accounts.test.ts
│   ├── balances.test.ts
│   ├── cards.test.ts
│   ├── deploy.test.ts
│   ├── fetch.test.ts
│   ├── publish.test.ts
│   ├── transactions.test.ts
│   └── upload.test.ts
├── __mocks__/         # Mock implementations
└── helpers.ts         # Test utilities
```

### Current Test Coverage

**28 tests passing** across 8 test files, covering:

- **Core Commands**: `cards`, `accounts`, `balances`, `transactions`
- **Code Management**: `deploy`, `fetch`, `upload`, `publish`
- **Error Handling**: CliError propagation, file not found, API errors
- **Edge Cases**: Missing files, invalid responses, default values

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

### Test Coverage Goals

- **Current**: 28 tests covering core functionality
- **Target**: 80%+ code coverage
- **Priority**: Critical paths first (deploy, fetch, upload, publish)

### Test Documentation

See `TEST_SUGGESTIONS.md` for:

- Complete list of commands needing tests
- Testing best practices
- Test implementation templates
- Coverage goals and priorities

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
- [Best Practices for CLI Development](https://github.com/lirantal/nodejs-cli-apps-best-practices)
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
