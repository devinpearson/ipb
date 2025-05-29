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
export async function publishedCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    const api = await initializeApi(credentials, options);

    console.log("fetching code...");
    const result = await api.getPublishedCode(options.cardKey);
    const code = result.data.result.code;
    console.log(`💾 saving to file: ${options.filename}`);
    await fs.writeFileSync(options.filename, code);
    console.log("🎉 code saved to file");
    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch published code");
  }
}
