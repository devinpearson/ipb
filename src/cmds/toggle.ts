import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  handleCliError,
  initializeApi,
  normalizeCardKey,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
}

/**
 * Enables code on a programmable card.
 * @param options - CLI options including card key and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function enableCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(!disableSpinner, '🍄 enabling code on card...').start();
    const api = await initializeApi(credentials, options);

    const result = await api.toggleCode(cardKey, true);
    spinner.stop();
    if (result.data.result.Enabled) {
      console.log('✅ code enabled');
    } else {
      console.log('❌ code enable failed');
    }
  } catch (error: unknown) {
    handleCliError(error, options, 'enable card code');
  }
}
