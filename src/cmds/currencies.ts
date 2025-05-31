import { credentials, initializeApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

/**
 * Fetch and display Investec currencies.
 * @param options CLI options
 */
export async function currenciesCommand(options: Options) {
  try {
    const api = await initializeApi(credentials, options);

    console.log("💵 fetching currencies");
    const result = await api.getCurrencies();
    console.log("");
    const currencies = result.data.result;
    if (!currencies) {
      console.log("No currencies found");
      return;
    }

    const simpleCurrencies = currencies.map(
      ({ Code, Name }: { Code: string; Name: string }) => ({ Code, Name }),
    );
    printTable(simpleCurrencies);
  } catch (error: any) {
    handleCliError(error, options, "fetch currencies");
  }
}
