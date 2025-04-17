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
  verbose: boolean;
}
export async function envCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    const api = await initializeApi(credentials, options);

    console.log("💎 fetching envs");

    console.log(" ");
    const result = await api.getEnv(options.cardKey);
    const envs = result.data.result.variables;

    console.log(`💾 saving to file: ${options.filename}`);
    fs.writeFileSync(options.filename, JSON.stringify(envs, null, 4));
    console.log("🎉 envs saved to file");
    console.log("");
  } catch (error: any) {
    console.error(
      chalk.redBright("Failed to fetch environment variables: "),
      error.message,
    );
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
