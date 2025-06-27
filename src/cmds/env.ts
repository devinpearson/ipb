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

export async function envCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, "card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const api = await initializeApi(credentials, options);

    const spinner = ora("💎 fetching envs...").start();

    const result = await api.getEnv(options.cardKey);
    const envs = result.data.result.variables;
    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    fs.writeFileSync(options.filename, JSON.stringify(envs, null, 4));
    console.log("🎉 envs saved to file");
  } catch (error: any) {
    handleCliError(error, options, "fetch environment variables");
  }
}
