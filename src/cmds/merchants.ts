import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
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

  await formatOutput(simpleMerchants, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    console.log(`\n${count} merchant(s) found.`);
  });
}
