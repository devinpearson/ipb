import { credentials, initializeApi } from "../index.js";
import chalk from "chalk";
interface Options {
  cardKey: number;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
export async function enableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  const api = await initializeApi(credentials, options);

  console.log("🍄 enabling code on card...");
  const result = await api.toggleCode(options.cardKey, true);
  if (result.data.result.Enabled) {
    console.log("✅ code enabled");
  } else {
    console.log("❌ code enable failed");
  }
  console.log("");
}
