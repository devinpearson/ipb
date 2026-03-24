import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  formatOutput,
  initializeApi,
  resolveSpinnerState,
  stopSpinner,
  withRetry,
} from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of cards.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function cardsCommand(options: CommonOptions) {
  const { isStdoutPiped } = await import('../utils.js');
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
  if (spinnerEnabled) {
    spinner.start();
  }
  let cards;
  try {
    const api = await initializeApi(credentials, options);

    // Use retry logic with rate limit handling
    const result = await withRetry(() => api.getCards(), {
      maxRetries: 3,
      verbose,
    });
    cards = result.data.cards;
    if (!cards) {
      if (!isPiped) {
        console.log('No cards found');
      } else {
        process.stdout.write('[]\n');
      }
      return;
    }
  } finally {
    stopSpinner(spinner, spinnerEnabled);
  }

  const simpleCards = cards.map(({ CardKey, CardNumber, IsProgrammable }) => ({
    CardKey,
    CardNumber,
    IsProgrammable,
  }));

  // Use full cards data when piped or structured output requested
  const dataToOutput =
    options.json || options.yaml || options.output || isPiped ? cards : simpleCards;
  await formatOutput(
    dataToOutput,
    { json: options.json, yaml: options.yaml, output: options.output },
    (count) => {
      if (!isPiped) {
        console.log(`\n${count} card(s) found.`);
      }
    }
  );
}
