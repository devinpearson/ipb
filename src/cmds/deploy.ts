import fs from "fs";
import dotenv from "dotenv";
import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
  env: string;
}

export async function deployCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 starting deployment...").start();
    let envObject = {};
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new Error("card-key is required");
      }
      options.cardKey = Number(credentials.cardKey);
    }

    const api = await initializeApi(credentials, options);

    if (options.env) {
      if (!fs.existsSync(`.env.${options.env}`)) {
        throw new Error("Env does not exist");
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
    if (result.data.result.codeId) {
      console.log("🎉 code deployed");
    }
  } catch (error: any) {
    handleCliError(error, { verbose: (options as any).verbose }, "deploy code");
  }
}
