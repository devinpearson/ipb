import fs from "fs";
import { credentials, printTitleBox } from "../index.js";
import { initializeApi } from "../utils.js";
import { handleCliError, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";
import { CliError, ERROR_CODES } from "../errors.js";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
  codeId: string;
}

export async function publishCommand(options: Options) {
  try {
    if (!fs.existsSync(options.filename)) {
      throw new CliError(ERROR_CODES.FILE_NOT_FOUND, "File does not exist");
    }
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new CliError(
          ERROR_CODES.MISSING_CARD_KEY,
          "card-key is required",
        );
      }
      options.cardKey = Number(credentials.cardKey);
    }
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(
      !disableSpinner,
      "🚀 publishing code...",
    ).start();
    const api = await initializeApi(credentials, options);

    const code = fs.readFileSync(options.filename).toString();
    const result = await api.uploadPublishedCode(
      options.cardKey,
      options.codeId,
      code,
    );
    spinner.stop();
    console.log(`🎉 code published with codeId: ${result.data.result.codeId}`);
  } catch (error: any) {
    handleCliError(error, options, "publish code");
  }
}
