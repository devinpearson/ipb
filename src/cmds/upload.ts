import fs from "fs";
import { credentials, initializeApi } from "../index.js";
import chalk from "chalk";
interface Options {
  cardKey: number;
  filename: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: string;
}
export async function uploadCommand(options: Options) {
  if (!fs.existsSync(options.filename)) {
    throw new Error("File does not exist");
  }
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    const api = await initializeApi(credentials, options);

    console.log("🚀 uploading code");
    const raw = { code: "" };
    const code = fs.readFileSync(options.filename).toString();
    raw.code = code;
    const result = await api.uploadCode(options.cardKey, raw);
    console.log(`🎉 code uploaded with codeId: ${result.data.result.codeId}`);
    console.log("");
  } catch (error: any) {
    console.error(
      chalk.redBright("Failed to upload to saved code:"),
      error.message,
    );
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
