import { credentials, initializeApi } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {
  cardKey: number;
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
      console.log("✅ code disabled successfully");
    } else {
      console.log("❌ code disable failed");
    }
    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "disable card code");
  }
}
