import fs from "fs";
import { credentials, printTitleBox } from "../index.js";
import { initializeApi } from "../utils.js";
import { handleCliError, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function fetchCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(
      !disableSpinner,
      "💳 fetching code...",
    ).start();
    const api = await initializeApi(credentials, options);
    const result = await api.getCode(options.cardKey);
    const code = result.data.result.code;

    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    await fs.writeFileSync(options.filename, code);
    console.log("🎉 code saved to file");
  } catch (error: any) {
    handleCliError(error, options, "fetch saved code");
  }
}
