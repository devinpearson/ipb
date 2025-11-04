import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
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
