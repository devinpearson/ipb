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

export async function uploadEnvCommand(options: Options) {
  if (!fs.existsSync(options.filename)) {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, "File does not exist");
  }
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, "card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const spinner = ora("🚀 uploading env...").start();
    const api = await initializeApi(credentials, options);

    const raw = { variables: {} };
    const variables = fs.readFileSync(options.filename, "utf8");
    raw.variables = JSON.parse(variables);
    const result = await api.uploadEnv(options.cardKey, raw);
    spinner.stop();
    console.log(`🎉 env uploaded`);
  } catch (error: any) {
    handleCliError(error, options, "upload environment variables");
  }
}
