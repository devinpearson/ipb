import { credentials, initializeApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

/**
 * Fetch and display Investec countries.
 * @param options CLI options
 */
export async function countriesCommand(options: Options) {
  try {
    const api = await initializeApi(credentials, options);

    console.log("🌍 fetching countries");
    const result = await api.getCountries();
    console.log("");
    const countries = result.data.result;
    if (!countries) {
      console.log("No countries found");
      return;
    }

    const simpleCountries = countries.map(
      ({ Code, Name }: { Code: string; Name: string }) => ({ Code, Name }),
    );
    printTable(simpleCountries);
  } catch (error: any) {
    handleCliError(error, options, "fetch countries");
  }
}
