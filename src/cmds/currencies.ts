import chalk from "chalk";
import { credentials, initializeApi } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
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
    console.log("Code \t Name");
    for (let i = 0; i < currencies.length; i++) {
      if (currencies[i]) {
        console.log(
          chalk.greenBright(`${currencies[i]?.Code ?? "N/A"}`) +
            ` \t ` +
            chalk.blueBright(`${currencies[i]?.Name ?? "N/A"}`),
        );
      }
    }
    console.log("");
  } catch (error) {
    console.error(chalk.redBright("Failed to fetch currencies:"), error);
  }
}
