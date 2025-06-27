import { credentials, printTitleBox } from "../index.js";
import { initializeApi } from "../utils.js";
import { handleCliError, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";
import { CliError, ERROR_CODES } from "../errors.js";

interface Options extends CommonOptions {
  cardKey: number;
}

export async function disableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, "card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(
      !disableSpinner,
      "🍄 disabling code on card...",
    ).start();
    const api = await initializeApi(credentials, options);

    const result = await api.toggleCode(options.cardKey, false);
    spinner.stop();
    if (!result.data.result.Enabled) {
      console.log("✅ code disabled successfully");
    } else {
      console.log("❌ code disable failed");
    }
  } catch (error: any) {
    handleCliError(error, options, "disable card code");
  }
}
