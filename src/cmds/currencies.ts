import { credentials, initializeApi, printTable } from "../index.js";
import { handleCliError } from "./utils.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}
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

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch currencies");
  }
}
