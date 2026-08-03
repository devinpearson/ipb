import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  createSpinner,
  initializeApi,
  isStdoutPiped,
  resolveSpinnerState,
  runListCommand,
  withRetry,
  withSpinner,
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
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching cards...');
  let cards: CardSummary[] | null | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);

    // Use retry logic with rate limit handling
    const result = await withRetry(() => api.getCards(), {
      maxRetries: 3,
      verbose,
    });
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
