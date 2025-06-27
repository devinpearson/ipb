import chalk from "chalk";
import fs from "fs";
import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";
import { CliError, ERROR_CODES } from "../errors.js";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function logsCommand(options: Options) {
  try {
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new CliError(ERROR_CODES.MISSING_CARD_KEY, "card-key is required");
      }
      options.cardKey = Number(credentials.cardKey);
    }
    if (options.filename === undefined || options.filename === "") {
      throw new CliError("E4006", "filename is required");
    }
    printTitleBox();
    const spinner = ora("📊 fetching execution items...").start();
    const api = await initializeApi(credentials, options);

    const result = await api.getExecutions(options.cardKey);
    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    fs.writeFileSync(
      options.filename,
      JSON.stringify(result.data.result.executionItems, null, 4),
    );
    console.log("🎉 " + chalk.greenBright("logs saved to file"));
  } catch (error: any) {
    handleCliError(error, options, "fetch execution logs");
  }
}
