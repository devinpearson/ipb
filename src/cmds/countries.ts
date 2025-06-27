import { credentials, printTitleBox } from "../index.js";
import { initializeApi } from "../utils.js";
import { handleCliError, printTable, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";

export async function countriesCommand(options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(
      !disableSpinner,
      "💳 fetching countries...",
    ).start();
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
    console.log(`\n${countries.length} country(ies) found.`);
  } catch (error: any) {
    handleCliError(error, options, "fetch countries");
  }
}
