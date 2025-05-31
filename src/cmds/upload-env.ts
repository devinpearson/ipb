import fs from "fs";
import { credentials, initializeApi } from "@src/index.js";
import { handleCliError } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

/**
 * Upload environment variables to the card.
 * @param options CLI options
 */
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
  } catch (error: any) {
    handleCliError(error, options, "upload environment variables");
  }
}
