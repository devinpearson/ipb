import { credentials, initializeApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

/**
 * Fetch and display Investec cards.
 * @param options CLI options
 */
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
      ({
        CardKey,
        CardNumber,
        IsProgrammable,
      }: {
        CardKey: string;
        CardNumber: string;
        IsProgrammable: boolean;
      }) => ({
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
