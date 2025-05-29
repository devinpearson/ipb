import chalk from "chalk";
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
export async function logsCommand(options: Options) {
  try {
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new Error("cardkey is required");
      }
      options.cardKey = Number(credentials.cardKey);
    }
    if (options.filename === undefined || options.filename === "") {
      throw new Error("filename is required");
    }
    const api = await initializeApi(credentials, options);

    console.log("📊 fetching execution items");
    console.log(" ");
    const result = await api.getExecutions(options.cardKey);
    console.log(`💾 saving to file: ${options.filename}`);
    console.log("");
    fs.writeFileSync(
      options.filename,
      JSON.stringify(result.data.result.executionItems, null, 4),
    );
    console.log("🎉 " + chalk.greenBright("logs saved to file"));
    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch execution logs");
  }
}
