import { credentials, initializeApi } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {}

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
  } catch (error: any) {
    handleCliError(error, options, "fetch cards");
  }
}
