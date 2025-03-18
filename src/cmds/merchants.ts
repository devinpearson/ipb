import chalk from "chalk";
import { credentials, initializeApi } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
export async function merchantsCommand(options: Options) {
  try {
    const api = await initializeApi(credentials, options);

    console.log("🏪 fetching merchants");
    const result = await api.getMerchants();
    const merchants = result.data.result;
    console.log("");
    if (!merchants) {
      console.log("No merchants found");
      return;
    }

    console.log("Code \t Name");
    for (let i = 0; i < merchants.length; i++) {
      if (merchants[i]) {
        console.log(
          chalk.greenBright(`${merchants[i]?.Code ?? "N/A"}`) +
            ` \t ` +
            chalk.blueBright(`${merchants[i]?.Name ?? "N/A"}`),
        );
      }
    }
    console.log("");
  } catch (error) {
    console.error(chalk.redBright("Failed to fetch merchants:"), error);
  }
}
