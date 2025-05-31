import { credentials, initializeApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

/**
 * Fetch and display Investec merchants.
 * @param options CLI options
 */
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

    const simpleMerchants = merchants.map(
      ({ Code, Name }: { Code: string; Name: string }) => ({ Code, Name }),
    );
    printTable(simpleMerchants);
  } catch (error: any) {
    handleCliError(error, options, "fetch merchants");
  }
}
