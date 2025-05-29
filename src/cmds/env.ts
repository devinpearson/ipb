import fs from "fs";
import { credentials, initializeApi } from "../index.js";
import { handleCliError } from "./utils.js";
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
    handleCliError(error, options, "fetch environment variables");
  }
}
