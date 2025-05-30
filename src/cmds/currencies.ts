import { credentials, initializeApi } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {}
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

    const simpleCurrencies = currencies.map(({ Code, Name }) => ({
      Code,
      Name,
    }));
    printTable(simpleCurrencies);
  } catch (error: any) {
    handleCliError(error, options, "fetch currencies");
  }
}
