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
} from "./cmds/index.js";
import { simulateCommand } from "./cmds/simulate.js";
import { registerCommand } from "./cmds/register.js";
import { loginCommand } from "./cmds/login.js";
import { accountsCommand } from "./cmds/accounts.js";
import { balancesCommand } from "./cmds/balances.js";
import { transactionsCommand } from "./cmds/transactions.js";
import { transferCommand } from "./cmds/transfer.js";
import { beneficiariesCommand } from "./cmds/beneficiaries.js";
import { payCommand } from "./cmds/pay.js";
import { handleCliError, loadCredentialsFile } from "./utils.js";
import type { Credentials, BasicOptions } from "./cmds/types.js";

const version = "0.8.3";
const program = new Command();

// Improve error output for missing arguments/options
program.showHelpAfterError();
program.showSuggestionAfterError();

// Only export what is needed outside this file
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};

// Print CLI title (used in some commands)
export async function printTitleBox() {
  // console.log("");
  // console.log("🦓 Investec Programmable Banking CLI");
  // // console.log("🔮 " + chalk.blueBright(`v${version}`));
  // console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  // console.log("");
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

export const credentials: Credentials = {
  host: process.env.INVESTEC_HOST || "https://openapi.investec.com",
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId,
  clientSecret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret,
  apiKey: process.env.INVESTEC_API_KEY || cred.apiKey,
  cardKey: process.env.INVESTEC_CARD_KEY || cred.cardKey,
  openaiKey: process.env.OPENAI_API_KEY || cred.openaiKey,
  sandboxKey: process.env.SANDBOX_KEY || cred.sandboxKey,
};

// Helper for shared API credential options
function addApiCredentialOptions(cmd: Command) {
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
    .option("-s,--spinner", "disable spinner during command execution")
    .option("-v,--verbose", "additional debugging information");
}

// Show help if no arguments are provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

async function main() {
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
    .argument("accountId", "accountId of the account to fetch balances for")
    .action(balancesCommand);
  addApiCredentialOptions(
    program.command("transfer").description("Allows transfer between accounts"),
  )
    .argument("accountId", "accountId of the account to transfer from")
    .argument(
      "beneficiaryAccountId",
      "beneficiaryAccountId of the account to transfer to",
    )
    .argument("amount", "amount to transfer in rands (e.g. 100.00)")
    .argument("reference", "reference for the transfer")
    .action(transferCommand);
  addApiCredentialOptions(
    program.command("pay").description("Pay a beneficiary from your account"),
  )
    .argument("accountId", "accountId of the account to transfer from")
    .argument("beneficiaryId", "beneficiaryId of the beneficiary to pay")
    .argument("amount", "amount to transfer in rands (e.g. 100.00)")
    .argument("reference", "reference for the payment")
    .action(payCommand);
  addApiCredentialOptions(
    program
      .command("transactions")
      .description("Gets your account transactions"),
  )
    .argument("accountId", "accountId of the account to fetch balances for")
    .action(transactionsCommand);
  addApiCredentialOptions(
    program.command("beneficiaries").description("Gets your beneficiaries"),
  ).action(beneficiariesCommand);
  program
    .command("new")
    .description("Sets up scaffoldings for a new project")
    .argument("name", "name of the new project")
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
    .argument("prompt", "prompt for the LLM")
    .option("-f,--filename <filename>", "the filename", "ai-generated.js")
    .option("-v,--verbose", "additional debugging information")
    .option("--force", "force overwrite existing files")
    .action(generateCommand);
  program
    .command("bank")
    .description("Uses the LLM to call your bank")
    .argument("prompt", "prompt for the LLM")
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

export async function optionCredentials(
  options: BasicOptions,
  credentials: any,
) {
  if (options.credentialsFile) {
    credentials = await loadCredentialsFile(
      credentials,
      options.credentialsFile,
    );
  }
  if (options.apiKey) {
    credentials.apiKey = options.apiKey;
  }
  if (options.clientId) {
    credentials.clientId = options.clientId;
  }
  if (options.clientSecret) {
    credentials.clientSecret = options.clientSecret;
  }
  if (options.host) {
    credentials.host = options.host;
  }
  return credentials;
}

main().catch((err) => {
  handleCliError(err, { verbose: true }, "run CLI");
  process.exit(1);
});
