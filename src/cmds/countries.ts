import chalk from "chalk";
import { credentials, initializeApi } from "../index.js";
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
    console.log("Code \t\t Name");
    for (let i = 0; i < countries.length; i++) {
      if (countries[i]) {
        console.log(
          chalk.greenBright(`${countries[i]?.Code ?? "N/A"}`) +
            ` \t ` +
            chalk.blueBright(`${countries[i]?.Name ?? "N/A"}`),
        );
      }
    }
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to fetch countries:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
