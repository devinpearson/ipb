import fs from "fs";
import { credentials, initializeApi } from "../index.js";
import { handleCliError } from "./utils.js";
interface Options {
  cardKey: number;
  filename: string;
  codeId: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
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
    const api = await initializeApi(credentials, options);

    console.log("🚀 publishing code...");
    const code = fs.readFileSync(options.filename).toString();
    const result = await api.uploadPublishedCode(
      options.cardKey,
      options.codeId,
      code,
    );
    console.log(`🎉 code published with codeId: ${result.data.result.codeId}`);
    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "publish code");
  }
}
