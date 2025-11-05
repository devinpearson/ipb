import { credentials, printTitleBox } from '../index.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  initializeApi,
  normalizeCardKey,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
}

/**
 * Disables code on a programmable card.
 * @param options - CLI options including card key and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function disableCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();

  // Require confirmation before disabling (deactivates code)
  const confirmed = await confirmDestructiveOperation(
    `This will disable programmable code on card ${cardKey}. Code will remain deployed but inactive. Continue?`,
    { yes: options.yes }
  );

  if (!confirmed) {
    console.log('Disable cancelled.');
    return;
  }

  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '🍄 disabling code on card...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.toggleCode(cardKey, false);
  spinner.stop();
  if (!result.data.result.Enabled) {
    console.log('✅ code disabled successfully');
  } else {
    console.log('❌ code disable failed');
  }
}
