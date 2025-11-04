import { credentials, printTitleBox } from '../index.js';
import { createSpinner, initializeApi, printTable } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of merchants.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function merchantsCommand(options: CommonOptions) {
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '🏪 fetching merchants...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getMerchants();
  const merchants = result.data.result;
  spinner.stop();
  if (!merchants) {
    console.log('No merchants found');
    return;
  }

  const simpleMerchants = merchants.map(({ Code, Name }) => ({ Code, Name }));
  printTable(simpleMerchants);
  console.log(`\n${merchants.length} merchant(s) found.`);
}
