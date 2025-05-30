import { credentials, initializeApi } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {
  cardKey: number;
}

export async function enableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    const api = await initializeApi(credentials, options);

    console.log("🍄 enabling code on card...");
    const result = await api.toggleCode(options.cardKey, true);
    if (result.data.result.Enabled) {
      console.log("✅ code enabled");
    } else {
      console.log("❌ code enable failed");
    }
  } catch (error: any) {
    handleCliError(error, options, "enable card code");
  }
}
