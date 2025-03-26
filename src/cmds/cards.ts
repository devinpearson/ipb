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

export async function cardsCommand(options: Options) {
  try {
    const api = await initializeApi(credentials, options);

    console.log("💳 fetching cards");
    const result = await api.getCards();
    const cards = result.data.cards;
    console.log("");
    if (!cards) {
      console.log("No cards found");
      return;
    }
    console.log("Card Key \tCard Number \t\tCode Enabled");
    for (let i = 0; i < cards.length; i++) {
      if (cards[i]) {
        console.log(
          chalk.greenBright(`${cards[i]?.CardKey ?? "N/A"}\t\t`) +
            chalk.blueBright(`${cards[i]?.CardNumber ?? "N/A"}\t\t`) +
            chalk.redBright(`${cards[i]?.IsProgrammable ?? "N/A"}`),
        );
      }
    }
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to fetch cards:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
