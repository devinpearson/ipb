#!/usr/bin/env node
// File: src/index.ts
// Main entry point for the Investec Programmable Banking CLI
// Sets up all CLI commands and shared options using Commander.js
// For more information, see README.md

import "dotenv/config";
import process from "process";
import fs from "fs";
import { homedir } from "os";
import { Command, Option } from "commander";
import chalk from "chalk";
import {
  cardsCommand,
  configCommand,
  logsCommand,
  deployCommand,
  fetchCommand,
  uploadCommand,
  envCommand,
  uploadEnvCommand,
  publishedCommand,
  publishCommand,
  enableCommand,
  disableCommand,
  runCommand,
  currenciesCommand,
  countriesCommand,
  merchantsCommand,
  newCommand,
  generateCommand,
  bankCommand,
} from "@cmds/index.js";
import { simulateCommand } from "@cmds/simulate.js";
import { registerCommand } from "@cmds/register.js";
import { loginCommand } from "@cmds/login.js";
import { accountsCommand } from "@cmds/accounts.js";
import { balancesCommand } from "@cmds/balances.js";
import { transactionsCommand } from "@cmds/transactions.js";
import { transferCommand } from "@cmds/transfer.js";
import { beneficiariesCommand } from "@cmds/beneficiaries.js";
import { payCommand } from "@cmds/pay.js";
import { handleCliError, loadCredentialsFile } from "@utils";
import type { Credentials, BasicOptions } from "@types";

// Fix: Ensure the Credentials interface includes cardKey, openaiKey, and sandboxKey

const version = "0.8.1-rc.3";
const program = new Command();

/**
 * The default credential file location and folder for the CLI.
 * @property {string} folder - The folder where credentials are stored.
 * @property {string} filename - The full path to the credentials file.
 */
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};

/**
 * Prints the CLI title box to the console.
 * Used for branding and visual separation in CLI output.
 * @returns {Promise<void>}
 */
export async function printTitleBox(): Promise<void> {
  console.log("");
  console.log("🦓 Investec Programmable Banking CLI");
  // console.log("🔮 " + chalk.blueBright(`v${version}`));
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("");
}

// Load credentials from file if present
let cred = {
  clientId: "",
  clientSecret: "",
  apiKey: "",
  cardKey: "",
  openaiKey: "",
  sandboxKey: "",
};
if (fs.existsSync(credentialLocation.filename)) {
  try {
    const data = fs.readFileSync(credentialLocation.filename, "utf8");
    cred = JSON.parse(data);
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        chalk.red(`🙀 Invalid credentials file format: ${err.message}`),
      );
      console.log("");
    } else {
      console.error(chalk.red("🙀 Invalid credentials file format"));
      console.log("");
    }
  }
}

/**
 * The credentials object, loaded from environment variables or credentials file.
 * @type {Credentials}
 */
export const credentials: Credentials = {
  host: process.env.INVESTEC_HOST || "https://openapi.investec.com",
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId,
  clientSecret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret,
  apiKey: process.env.INVESTEC_API_KEY || cred.apiKey,
  cardKey: process.env.INVESTEC_CARD_KEY || cred.cardKey,
  openaiKey: process.env.OPENAI_API_KEY || cred.openaiKey,
  sandboxKey: process.env.SANDBOX_KEY || cred.sandboxKey,
};

/**
 * Adds shared API credential options to a Commander.js command.
 * @param {Command} cmd - The Commander command to add options to.
 * @returns {Command} The command with added options.
 */
function addApiCredentialOptions(cmd: Command): Command {
  return cmd
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information");
}

// Show help if no arguments are provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

/**
 * Main entry point for the CLI. Sets up all commands and parses arguments.
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  program
    .name("ipb")
    .description("CLI to manage Investec Programmable Banking")
    .version(version);

  // Use shared options for most commands
  addApiCredentialOptions(
    program.command("cards").description("Gets a list of your cards"),
  ).action(cardsCommand);
  addApiCredentialOptions(
    program.command("config").description("set auth credentials"),
  )
    .option("--card-key <cardKey>", "Sets your card key for the Investec API")
    .option(
      "--openai-key <openaiKey>",
      "Sets your OpenAI key for the AI generation",
    )
    .option(
      "--sandbox-key <sandboxKey>",
      "Sets your sandbox key for the AI generation",
    )
    .action(configCommand);
  addApiCredentialOptions(
    program.command("deploy").description("deploy code to card"),
  )
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(deployCommand);
  addApiCredentialOptions(
    program.command("logs").description("fetches logs from the api"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(logsCommand);
  program
    .command("run")
    .description("runs the code locally")
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run")
    .option("-a,--amount <amount>", "amount in cents", "10000")
    .option("-u,--currency <currency>", "currency code", "zar")
    .option("-z,--mcc <mcc>", "merchant category code", "0000")
    .option("-m,--merchant <merchant>", "merchant name", "The Coders Bakery")
    .option("-i,--city <city>", "city name", "Cape Town")
    .option("-o,--country <country>", "country code", "ZA")
    .option("-v,--verbose", "additional debugging information")
    .action(runCommand);
  addApiCredentialOptions(
    program.command("fetch").description("fetches the saved code"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(fetchCommand);
  addApiCredentialOptions(
    program.command("upload").description("uploads to saved code"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(uploadCommand);
  addApiCredentialOptions(
    program.command("env").description("downloads to env to a local file"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(envCommand);
  addApiCredentialOptions(
    program.command("upload-env").description("uploads env to the card"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(uploadEnvCommand);
  addApiCredentialOptions(
    program
      .command("published")
      .description("downloads to published code to a local file"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(publishedCommand);
  addApiCredentialOptions(
    program.command("publish").description("publishes code to the card"),
  )
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("-i,--code-id <codeId>", "the code id of the save code")
    .action(publishCommand);
  program
    .command("simulate")
    .description("runs the code using the online simulator")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("-e,--env <env>", "env to run", "development")
    .option("-a,--amount <amount>", "amount in cents", "10000")
    .option("-u,--currency <currency>", "currency code", "zar")
    .option("-z,--mcc <mcc>", "merchant category code", "0000")
    .option("-m,--merchant <merchant>", "merchant name", "The Coders Bakery")
    .option("-i,--city <city>", "city name", "Cape Town")
    .option("-o,--country <country>", "country code", "ZA")
    .option("-v,--verbose", "additional debugging information")
    .action(simulateCommand);
  addApiCredentialOptions(
    program.command("enable").description("enables code to be used on card"),
  )
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(enableCommand);
  addApiCredentialOptions(
    program.command("disable").description("disables code to be used on card"),
  )
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(disableCommand);
  addApiCredentialOptions(
    program
      .command("currencies")
      .description("Gets a list of supported currencies"),
  ).action(currenciesCommand);
  addApiCredentialOptions(
    program.command("countries").description("Gets a list of countries"),
  ).action(countriesCommand);
  addApiCredentialOptions(
    program.command("merchants").description("Gets a list of merchants"),
  ).action(merchantsCommand);
  addApiCredentialOptions(
    program.command("accounts").description("Gets a list of your accounts"),
  )
    .option("--json", "output raw JSON")
    .action(accountsCommand);
  addApiCredentialOptions(
    program.command("balances").description("Gets your account balances"),
  )
    .argument("<string>", "accountId of the account to fetch balances for")
    .action(balancesCommand);
  addApiCredentialOptions(
    program.command("transfer").description("Allows transfer between accounts"),
  )
    .argument("<string>", "accountId of the account to transfer from")
    .argument("<string>", "beneficiaryAccountId of the account to transfer to")
    .argument("<number>", "amount to transfer in rands (e.g. 100.00)")
    .argument("<string>", "reference for the transfer")
    .action(transferCommand);
  addApiCredentialOptions(
    program.command("pay").description("Pay a beneficiary from your account"),
  )
    .argument("<string>", "accountId of the account to transfer from")
    .argument("<string>", "beneficiaryId of the beneficiary to pay")
    .argument("<number>", "amount to transfer in rands (e.g. 100.00)")
    .argument("<string>", "reference for the payment")
    .action(payCommand);
  addApiCredentialOptions(
    program
      .command("transactions")
      .description("Gets your account transactions"),
  )
    .argument("<string>", "accountId of the account to fetch balances for")
    .action(transactionsCommand);
  addApiCredentialOptions(
    program.command("beneficiaries").description("Gets your beneficiaries"),
  ).action(beneficiariesCommand);
  program
    .command("new")
    .description("Sets up scaffoldings for a new project")
    .argument("<string>", "name of the new project")
    .option("-v,--verbose", "additional debugging information")
    .option("--force", "force overwrite existing files")
    .addOption(
      new Option("--template <template>", "name of the template to use")
        .default("default")
        .choices(["default", "petro"]),
    )
    .action(newCommand);
  program
    .command("ai")
    .description("Generates card code using an LLM")
    .argument("<string>", "prompt for the LLM")
    .option("-f,--filename <filename>", "the filename", "ai-generated.js")
    .option("-v,--verbose", "additional debugging information")
    .option("--force", "force overwrite existing files")
    .action(generateCommand);
  program
    .command("bank")
    .description("Uses the LLM to call your bank")
    .argument("<string>", "prompt for the LLM")
    .option("-v,--verbose", "additional debugging information")
    .action(bankCommand);
  program
    .command("register")
    .description("registers with the server for LLM generation")
    .option("-e,--email <email>", "your email")
    .option("-p,--password <password>", "your password")
    .action(registerCommand);
  program
    .command("login")
    .description("login with the server for LLM generation")
    .option("-e,--email <email>", "your email")
    .option("-p,--password <password>", "your password")
    .action(loginCommand);

  try {
    await program.parseAsync(process.argv);
    console.log(""); // Add a newline after command execution
  } catch (err) {
    // Use handleCliError with fallback context and options
    handleCliError(err, { verbose: true }, "run CLI");
    process.exit(1);
  }
}

/**
 * Initializes the Investec Card API or mock API based on environment.
 * @param {Credentials} credentials - The credentials to use for API authentication.
 * @param {BasicOptions} options - CLI options that may override credentials.
 * @returns {Promise<any>} The initialized API instance.
 */
export async function initializeApi(
  credentials: Credentials,
  options: BasicOptions,
): Promise<any> {
  printTitleBox();
  credentials = await optionCredentials(options, credentials);
  let api;
  if (process.env.DEBUG == "true") {
    // console.log(chalk.yellow('Using mock API for debugging'));
    const { CardApi } = await import("./mock-card.js");
    api = new CardApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host,
    );
  } else {
    const { InvestecCardApi } = await import("investec-card-api");
    api = new InvestecCardApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host,
    );
  }
  const accessResult = await api.getAccessToken();
  if (accessResult instanceof Error) {
    console.error(chalk.red(`🙀 ${accessResult.message}`));
    process.exit(1);
  }
  // console.log(chalk.green('Access token acquired successfully'));
  return api;
}

/**
 * Initializes the Investec Programmable Banking API (PB API).
 * This API is used for account, transaction, and beneficiary operations.
 *
 * @param credentials - The credentials to use for API authentication.
 * @param options - CLI options that may override credentials.
 * @returns {Promise<any>} The initialized PB API instance.
 */
export async function initializePbApi(
  credentials: Credentials,
  options: BasicOptions,
): Promise<any> {
  credentials = await optionCredentials(options, credentials);
  let api;
  const { InvestecPbApi } = await import("investec-pb-api");
  api = new InvestecPbApi(
    credentials.clientId,
    credentials.clientSecret,
    credentials.apiKey,
    credentials.host,
  );
  await api.getAccessToken();
  return api;
}

/**
 * Applies CLI options to override or supplement credentials.
 * Loads credentials from a file if specified, and merges with environment and CLI options.
 *
 * @param options - CLI options that may override credentials.
 * @param credentials - The credentials object to update.
 * @returns {Promise<Credentials>} The updated credentials object.
 */
export async function optionCredentials(
  options: BasicOptions,
  credentials: Credentials,
): Promise<Credentials> {
  let opts = { ...options };
  if (opts.credentialsFile) {
    try {
      const data = fs.readFileSync(opts.credentialsFile, "utf8");
      const fileCreds = JSON.parse(data);
      credentials = { ...credentials, ...fileCreds } as Credentials;
      console.log(
        chalk.green(`✅ Loaded credentials from ${opts.credentialsFile}`),
      );
    } catch (err) {
      if (err instanceof Error) {
        console.error(
          chalk.red(`🙀 Invalid credentials file format: ${err.message}`),
        );
        console.log("");
      } else {
        console.error(chalk.red("🙀 Invalid credentials file format"));
        console.log("");
      }
      process.exit(1);
    }
  }
  if (opts.apiKey) credentials.apiKey = opts.apiKey;
  if (opts.clientId) credentials.clientId = opts.clientId;
  if (opts.clientSecret) credentials.clientSecret = opts.clientSecret;
  if (opts.host) credentials.host = opts.host;
  if ((opts as any).cardKey)
    (credentials as any).cardKey = (opts as any).cardKey;
  if ((opts as any).openaiKey)
    (credentials as any).openaiKey = (opts as any).openaiKey;
  if ((opts as any).sandboxKey)
    (credentials as any).sandboxKey = (opts as any).sandboxKey;

  // Validate required credentials
  if (!credentials.apiKey) {
    console.error(chalk.red("🙀 API key is required"));
    process.exit(1);
  }
  if (!credentials.clientId) {
    console.error(chalk.red("🙀 Client ID is required"));
    process.exit(1);
  }
  if (!credentials.clientSecret) {
    console.error(chalk.red("🙀 Client secret is required"));
    process.exit(1);
  }

  return credentials;
}

// Execute the main function to start the CLI
main();
