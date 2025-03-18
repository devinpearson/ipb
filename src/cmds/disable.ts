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

export async function disableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("cardkey is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    const api = await initializeApi(credentials, options);

    console.log("🍄 disabling code on card...");
    const result = await api.toggleCode(options.cardKey, false);
    if (!result.data.result.Enabled) {
      console.log("❌ code disabled");
    } else {
      console.log("✅ code disable failed");
    }
    console.log("");
  } catch (error) {
    console.error(chalk.redBright("Failed to disable:"), error);
  }
}
