import { credentials, initializeApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

export async function merchantsCommand(options: Options) {
  try {
    const api = await initializeApi(credentials, options);

    console.log("🏪 fetching merchants");
    const result = await api.getMerchants();
    const merchants = result.data.result;
    console.log("");
    if (!merchants) {
      console.log("No merchants found");
      return;
    }

    const simpleMerchants = merchants.map(({ Code, Name }) => ({ Code, Name }));
    printTable(simpleMerchants);
  } catch (error: any) {
    handleCliError(error, options, "fetch merchants");
  }
}
