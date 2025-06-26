import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {
  cardKey: number;
}

export async function disableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const api = await initializeApi(credentials, options);

    const spinner = ora("🍄 disabling code on card...").start();
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
