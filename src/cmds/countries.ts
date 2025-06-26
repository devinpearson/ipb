import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}
export async function countriesCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching countries...").start();
    const api = await initializeApi(credentials, options);

    const result = await api.getCountries();
    spinner.stop();
    const countries = result.data.result;
    if (!countries) {
      console.log("No countries found");
      return;
    }

    const simpleCountries = countries.map(({ Code, Name }) => ({ Code, Name }));
    printTable(simpleCountries);
  } catch (error: any) {
    handleCliError(error, options, "fetch countries");
  }
}
