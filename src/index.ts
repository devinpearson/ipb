#!/usr/bin/env node
import "dotenv/config";
import process from "process";
import fs from "fs";
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
import { homedir } from "os";
import { Command, Option } from "commander";
import chalk from "chalk";
import { simulateCommand } from "./cmds/simulate.js";
import { InvestecCardApi } from "investec-card-api";
import { CardApi } from "./mock-card.js";
import { registerCommand } from "./cmds/register.js";
import { loginCommand } from "./cmds/login.js";
import { InvestecPbApi } from "investec-pb-api";
import { accountsCommand } from "./cmds/accounts.js";
import { balancesCommand } from "./cmds/balances.js";
import { transactionsCommand } from "./cmds/transactions.js";

const version = "0.8.1-rc.3";
const program = new Command();
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};
export async function printTitleBox() {
  //   const v = await checkLatestVersion()
  console.log("");
  console.log("🦓 Investec Programmable Banking CLI");
  console.log("🔮 " + chalk.blueBright(`v${version}`));
  //   if (v !== version) {
  // console.log("🔥 " + chalk.redBright(`v${v} is available`))
  //   };
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("");
}

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
        console.log(""),
      );
    } else {
      console.error(chalk.red("🙀 Invalid credentials file format"));
      console.log("");
    }
  }
}
export interface Credentials {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
  openaiKey: string;
  sandboxKey: string;
}

export interface BasicOptions {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}

export async function initializeApi(
  credentials: Credentials,
  options: BasicOptions,
) {
  printTitleBox();
  credentials = await optionCredentials(options, credentials);
  let api;
  if (process.env.DEBUG == "true") {
    // console.log(chalk.yellow('Using mock API for debugging'));
    api = new CardApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host,
    );
  } else {
    api = new InvestecCardApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host,
    );
  }
  const accessResult = await api.getAccessToken();
  if (accessResult.scope !== "cards") {
    console.log(
      chalk.redBright(
        "Scope is not only cards, please consider reducing the scopes",
      ),
    );
    console.log("");
  }
  return api;
}

export async function initializePbApi(
  credentials: Credentials,
  options: BasicOptions,
) {
  printTitleBox();
  credentials = await optionCredentials(options, credentials);
  let api;
  // if (process.env.DEBUG == "true") {
  //   // console.log(chalk.yellow('Using mock API for debugging'));
  //   api = new CardApi(
  //     credentials.clientId,
  //     credentials.clientSecret,
  //     credentials.apiKey,
  //     credentials.host,
  //   );
  // } else {
    api = new InvestecPbApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host,
    );
  // }
  await api.getAccessToken();
  
  return api;
}

export async function optionCredentials(
  options: BasicOptions,
  credentials: any,
) {
  if (options.credentialsFile) {
    credentials = await loadcredentialsFile(
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
export async function loadcredentialsFile(
  credentials: Credentials,
  credentialsFile: string,
) {
  if (credentialsFile) {
    const file = await import("file://" + credentialsFile, {
      with: { type: "json" },
    });
    if (file.host) {
      credentials.host = file.host;
    }
    if (file.apiKey) {
      credentials.apiKey = file.apiKey;
    }
    if (file.clientId) {
      credentials.clientId = file.clientId;
    }
    if (file.clientSecret) {
      credentials.clientSecret = file.clientSecret;
    }
    if (file.openaiKey) {
      credentials.openaiKey = file.openaiKey;
    }
    if (file.sandboxKey) {
      credentials.sandboxKey = file.sandboxKey;
    }
  }
  return credentials;
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
async function main() {
  program
    .name("ipb")
    .description("CLI to manage Investec Programmable Banking")
    .version(version);

  program
    .command("cards")
    .description("Gets a list of your cards")
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
    .option("-v,--verbose", "additional debugging information")
    .action(cardsCommand);

  program
    .command("config")
    .description("set auth credentials")
    .option("--api-key <apiKey>", "Sets your api key for the Investec API")
    .option(
      "--client-id <clientId>",
      "Sets your client Id for the Investec API",
    )
    .option(
      "--client-secret <clientSecret>",
      "Sets your client secret for the Investec API",
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
    .option("-v,--verbose", "additional debugging information")
    .action(configCommand);

  program
    .command("deploy")
    .description("deploy code to card")
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(deployCommand);

  program
    .command("logs")
    .description("fetches logs from the api")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
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

  program
    .command("fetch")
    .description("fetches the saved code")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(fetchCommand);

  program
    .command("upload")
    .description("uploads to saved code")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(uploadCommand);

  program
    .command("env")
    .description("downloads to env to a local file")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(envCommand);

  program
    .command("upload-env")
    .description("uploads env to the card")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(uploadEnvCommand);

  program
    .command("published")
    .description("downloads to published code to a local file")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(publishedCommand);

  program
    .command("publish")
    .description("publishes code to the card")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("-i,--code-id <codeId>", "the code id of the save code")
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
    .option("-v,--verbose", "additional debugging information")
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
  program
    .command("enable")
    .description("enables code to be used on card")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(enableCommand);

  program
    .command("disable")
    .description("disables code to be used on card")
    .option("-c,--card-key <cardKey>", "the cardkey")
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
    .option("-v,--verbose", "additional debugging information")
    .action(disableCommand);

  program
    .command("currencies")
    .description("Gets a list of supported currencies")
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
    .option("-v,--verbose", "additional debugging information")
    .action(currenciesCommand);

  program
    .command("countries")
    .description("Gets a list of countries")
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
    .option("-v,--verbose", "additional debugging information")
    .action(countriesCommand);

  program
    .command("merchants")
    .description("Gets a list of merchants")
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
    .option("-v,--verbose", "additional debugging information")
    .action(merchantsCommand);
  
  program
    .command("accounts")
    .description("Gets a list of your accounts")
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
    .option("-v,--verbose", "additional debugging information")
    .action(accountsCommand);

  program
    .command("balances")
    .description("Gets your account balances")
    .argument("<string>", "accountId of the account to fetch balances for")
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
    .option("-v,--verbose", "additional debugging information")
    .action(balancesCommand);

  program
    .command("transactions")
    .description("Gets your account transactions")
    .argument("<string>", "accountId of the account to fetch balances for")
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
    .option("-v,--verbose", "additional debugging information")
    .action(transactionsCommand);

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
  } catch (err) {
    if (err instanceof Error) {
      console.log("🙀 Error encountered: " + chalk.red(err.message));
      console.log("");
    } else {
      console.log(
        "🙀 Error encountered: " + chalk.red("An unknown error occurred"),
      );
      console.log("");
    }
  }
}

export async function checkLatestVersion() {
  const response = await fetch("https://registry.npmjs.org/investec-ipb", {
    method: "GET",
    headers: {
      Accept: "application/vnd.npm.install-v1+json",
    },
  });

  const data = (await response.json()) as { "dist-tags": { latest: string } };
  const latestVersion = data["dist-tags"].latest;

  return latestVersion;
}

main();
