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
export async function uploadEnvCommand(options: Options) {
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

    console.log("🚀 uploading env");
    const raw = { variables: {} };
    const variables = fs.readFileSync(options.filename, "utf8");
    raw.variables = JSON.parse(variables);
    const result = await api.uploadEnv(options.cardKey, raw);
    console.log(`🎉 env uploaded`);
    console.log("");
  } catch (error: any) {
    console.error(
      chalk.redBright("Failed to upload environment variables: "),
      error.message,
    );
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
