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

    const simpleCards = cards.map(
      ({ CardKey, CardNumber, IsProgrammable }) => ({
        CardKey,
        CardNumber,
        IsProgrammable,
      }),
    );
    printTable(simpleCards);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch cards");
  }
}
