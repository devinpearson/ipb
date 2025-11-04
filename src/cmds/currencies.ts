import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of supported currencies.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function currenciesCommand(options: CommonOptions) {
  printTitleBox();
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '💳 fetching currencies...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getCurrencies();
  spinner.stop();
  const currencies = result.data.result;
  if (!currencies) {
    console.log('No currencies found');
    return;
  }

  const simpleCurrencies = currencies.map(({ Code, Name }) => ({
    Code,
    Name,
  }));

  await formatOutput(simpleCurrencies, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    console.log(`\n${count} currency(ies) found.`);
  });
}
