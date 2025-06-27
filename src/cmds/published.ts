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

export async function publishedCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, "card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const spinner = ora("🚀 fetching code...").start();
    const api = await initializeApi(credentials, options);

    const result = await api.getPublishedCode(options.cardKey);
    const code = result.data.result.code;
    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    await fs.writeFileSync(options.filename, code);
    console.log("🎉 code saved to file");
  } catch (error: any) {
    handleCliError(error, options, "fetch published code");
  }
}
