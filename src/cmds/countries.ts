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
