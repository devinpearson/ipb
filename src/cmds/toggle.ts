import { CliError, ERROR_CODES } from "../errors.js";
import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {
  cardKey: number;
}

export async function enableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, "card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const spinner = ora("🍄 enabling code on card...").start();
    const api = await initializeApi(credentials, options);

    const result = await api.toggleCode(options.cardKey, true);
    spinner.stop();
    if (result.data.result.Enabled) {
      console.log("✅ code enabled");
    } else {
      console.log("❌ code enable failed");
    }
  } catch (error: any) {
    handleCliError(error, options, "enable card code");
  }
}
