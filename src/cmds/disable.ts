import { credentials, initializeApi } from "@src/index.js";
import { handleCliError } from "@utils";
import type { CommonOptions } from "@types";
interface Options extends CommonOptions {
  cardKey: number;
}

/**
 * Disable programmable code on the card.
 * @param options CLI options
 */

export async function disableCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
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
  } catch (error: any) {
    handleCliError(error, options, "disable card code");
  }
}
