import chalk from "chalk";
import fs from "fs";
import { credentials, initializeApi } from "@src/index.js";
import { handleCliError } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

/**
 * Fetch and display execution logs from the API.
 * @param options CLI options
 */
export async function logsCommand(options: Options) {
  try {
    if (options.cardKey === undefined) {
      if (credentials.cardKey === "") {
        throw new Error("card-key is required");
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
  } catch (error: any) {
    handleCliError(error, options, "fetch execution logs");
  }
}
