import fs from "fs";
import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
  codeId: string;
}

export async function publishCommand(options: Options) {
  try {
    if (!fs.existsSync(options.filename)) {
      throw new Error("File does not exist");
    }
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new Error("card-key is required");
      }
      options.cardKey = Number(credentials.cardKey);
    }
    printTitleBox();
    const spinner = ora("🚀 publishing code...").start();
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
