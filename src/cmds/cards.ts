import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}

export async function cardsCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching cards...").start();
    const api = await initializeApi(credentials, options);

    const result = await api.getCards();
    const cards = result.data.cards;
    spinner.stop();
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
