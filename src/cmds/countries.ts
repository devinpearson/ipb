import { credentials, initializeApi } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {}
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

    const simpleCountries = countries.map(({ Code, Name }) => ({ Code, Name }));
    printTable(simpleCountries);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch countries");
  }
}
