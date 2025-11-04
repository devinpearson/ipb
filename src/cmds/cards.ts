import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi, printTable } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of cards.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function cardsCommand(options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '💳 fetching cards...').start();
    const api = await initializeApi(credentials, options);

    const result = await api.getCards();
    const cards = result.data.cards;
    spinner.stop();
    if (!cards) {
      console.log('No cards found');
      return;
    }

    const simpleCards = cards.map(({ CardKey, CardNumber, IsProgrammable }) => ({
      CardKey,
      CardNumber,
      IsProgrammable,
    }));
    printTable(simpleCards);
    console.log(`\n${cards.length} card(s) found.`);
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch cards');
  }
}
