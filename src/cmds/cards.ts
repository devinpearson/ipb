import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
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
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '💳 fetching cards...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getCards();
  const cards = result.data.cards;
  spinner.stop();
  if (!cards) {
    if (!isPiped) {
      console.log('No cards found');
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  const simpleCards = cards.map(({ CardKey, CardNumber, IsProgrammable }) => ({
    CardKey,
    CardNumber,
    IsProgrammable,
  }));

  // Use full cards data when piped or structured output requested
  const dataToOutput = options.json || options.yaml || options.output || isPiped ? cards : simpleCards;
  await formatOutput(dataToOutput, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    if (!isPiped) {
      console.log(`\n${count} card(s) found.`);
    }
  });
}
