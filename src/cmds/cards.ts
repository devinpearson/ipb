import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  initializeApi,
  isStdoutPiped,
  runListCommand,
  withCommandSpinner,
  withRetry,
} from '../utils.js';
import type { CommonOptions } from './types.js';

type CardSummary = {
  CardKey: string | number;
  CardNumber: string;
  IsProgrammable: boolean;
};

/**
 * Fetches and displays a list of cards.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function cardsCommand(options: CommonOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  let cards: CardSummary[] | null | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching cards...', async (verbose) => {
    const api = await initializeApi(credentials, options);
    const result = await withRetry(() => api.getCards(), { verbose });
    cards = result.data.cards;
  });

  await runListCommand({
    isPiped,
    items: cards,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No cards found',
    countMessage: (count) => `${count} card(s) found.`,
    mapSimple: (rows) =>
      rows.map(({ CardKey, CardNumber, IsProgrammable }) => ({
        CardKey,
        CardNumber,
        IsProgrammable,
      })),
  });
}
