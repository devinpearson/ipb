import fs from "fs";
import dotenv from "dotenv";
import { credentials, printTitleBox } from "../index.js";
import { initializeApi } from "../utils.js";
import { handleCliError, createSpinner } from "../utils.js";
import type { Spinner } from "../utils.js";
import type { CommonOptions } from "./types.js";
import { CliError, ERROR_CODES } from "../errors.js";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
  env: string;
}

export async function deployCommand(options: Options) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(
      !disableSpinner,
      "💳 starting deployment...",
    ).start();
    let envObject = {};
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new CliError(
          ERROR_CODES.MISSING_CARD_KEY,
          "card-key is required",
        );
      }
      options.cardKey = Number(credentials.cardKey);
    }

    const api = await initializeApi(credentials, options);

    if (options.env) {
      if (!fs.existsSync(`.env.${options.env}`)) {
        throw new CliError(
          ERROR_CODES.MISSING_ENV_FILE,
          `Env file .env.${options.env} does not exist`,
        );
      }
      spinner.text = `📦 uploading env from .env.${options.env}`;
      envObject = dotenv.parse(fs.readFileSync(`.env.${options.env}`));

      await api.uploadEnv(options.cardKey, { variables: envObject });
      spinner.text = "📦 env uploaded";
      //console.log("📦 env deployed");
    }
    spinner.text = "🚀 deploying code";
    //console.log("🚀 deploying code");
    const raw = { code: "" };
    const code = fs.readFileSync(options.filename).toString();
    raw.code = code;
    const saveResult = await api.uploadCode(options.cardKey, raw);
    // console.log(saveResult);
    const result = await api.uploadPublishedCode(
      options.cardKey,
      saveResult.data.result.codeId,
      code,
    );
    spinner.stop();
    console.log(
      `🎉 code deployed with codeId: ${saveResult.data.result.codeId}`,
    );
  } catch (error: any) {
    handleCliError(error, options, "deploy code");
  }
}
