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
} from "./cmds/index.js";
import { homedir } from "os";
import { Command } from "commander";
import chalk from "chalk";
const version = "0.6.0";
const program = new Command();
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};
export function printTitleBox() {
  console.log("");
  console.log("🦓 Investec Programmable Banking CLI");
  console.log("🔮 " + chalk.blueBright(`v${version}`));
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("");
}

let cred = {
  clientId: "",
  clientSecret: "",
  apiKey: "",
  cardKey: "",
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

export const credentials = {
  host: process.env.INVESTEC_HOST || "https://openapi.investec.com",
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId,
  secret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret,
  apikey: process.env.INVESTEC_API_KEY || cred.apiKey,
  cardkey: process.env.INVESTEC_CARD_KEY || cred.cardKey,
};
async function main() {
  program
    .name("ipb")
    .description("CLI to manage Investec Programmable Banking")
    .version(version);

  program
    .command("cards")
    .description("Gets a list of your cards")
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
    .action(configCommand);

  program
    .command("deploy")
    .description("deploy code to card")
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run", "development")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(deployCommand);

  program
    .command("logs")
    .description("fetches logs from the api")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(logsCommand);

  program
    .command("run")
    .description("runs the code locally")
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run", "development")
    .option("-a,--amount <amount>", "amount in cents", "10000")
    .option("-c,--currency <currency>", "currency code", "zar")
    .option("-z,--mcc <mcc>", "merchant category code", "0000")
    .option("-m,--merchant <merchant>", "merchant name", "The Coders Bakery")
    .option("-i,--city <city>", "city name", "Cape Town")
    .option("-o,--country <country>", "country code", "ZA")
    .action(runCommand);

  program
    .command("fetch")
    .description("fetches the saved code")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(fetchCommand);

  program
    .command("upload")
    .description("uploads to saved code")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(uploadCommand);

  program
    .command("env")
    .description("downloads to env to a local file")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(envCommand);

  program
    .command("upload-env")
    .description("uploads env to the card")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(uploadEnvCommand);

  program
    .command("published")
    .description("downloads to published code to a local file")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(publishedCommand);

  program
    .command("publish")
    .description("publishes code to the card")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("-i,--code-id <codeId>", "the code id of the save code")
    .action(publishCommand);

  program
    .command("enable")
    .description("enables code to be used on card")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(enableCommand);

  program
    .command("disable")
    .description("disables code to be used on card")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .action(disableCommand);

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

main();
