import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}
export async function currenciesCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching currencies...").start();
    const api = await initializeApi(credentials, options);

    const result = await api.getCurrencies();
    spinner.stop();
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
