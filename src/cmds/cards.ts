import chalk from "chalk";
import { credentials, initializeApi } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}

export async function cardsCommand(options: Options) {
  const api = await initializeApi(credentials, options);

  console.log("💳 fetching cards");
  const result = await api.getCards();
  const cards = result.data.cards;
  console.log("");
  if (!cards) {
    console.log("No cards found");
    return;
  }
  console.log("Card Key \t Card Number \t\t Code Enabled");
  for (let i = 0; i < cards.length; i++) {
    if (cards[i]) {
      console.log(
        chalk.greenBright(`${cards[i]?.CardKey ?? "N/A"}`) +
          ` \t ` +
          chalk.blueBright(`${cards[i]?.CardNumber ?? "N/A"}`) +
          chalk.redBright(` \t ${cards[i]?.IsProgrammable ?? "N/A"}`),
      );
    }
  }
  console.log("");
}
