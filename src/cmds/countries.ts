import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of supported countries.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function countriesCommand(options: CommonOptions) {
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  
  if (!isPiped) {
    printTitleBox();
  }
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '💳 fetching countries...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getCountries();
  spinner.stop();
  const countries = result.data.result;
  if (!countries) {
    if (!isPiped) {
      console.log('No countries found');
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  const simpleCountries = countries.map(({ Code, Name }) => ({ Code, Name }));

  // Use full countries data when piped or structured output requested
  const dataToOutput = options.json || options.yaml || options.output || isPiped ? countries : simpleCountries;
  await formatOutput(dataToOutput, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    if (!isPiped) {
      console.log(`\n${count} country(ies) found.`);
    }
  });
}
