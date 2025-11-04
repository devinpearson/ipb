import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of supported countries.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function countriesCommand(options: CommonOptions) {
  printTitleBox();
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '💳 fetching countries...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getCountries();
  spinner.stop();
  const countries = result.data.result;
  if (!countries) {
    console.log('No countries found');
    return;
  }

  const simpleCountries = countries.map(({ Code, Name }) => ({ Code, Name }));

  await formatOutput(simpleCountries, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    console.log(`\n${count} country(ies) found.`);
  });
}
