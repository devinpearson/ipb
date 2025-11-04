import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of supported currencies.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function currenciesCommand(options: CommonOptions) {
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  
  if (!isPiped) {
    printTitleBox();
  }
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '💳 fetching currencies...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getCurrencies();
  spinner.stop();
  const currencies = result.data.result;
  if (!currencies) {
    if (!isPiped) {
      console.log('No currencies found');
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  const simpleCurrencies = currencies.map(({ Code, Name }) => ({
    Code,
    Name,
  }));

  // Use full currencies data when piped or structured output requested
  const dataToOutput = options.json || options.yaml || options.output || isPiped ? currencies : simpleCurrencies;
  await formatOutput(dataToOutput, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    if (!isPiped) {
      console.log(`\n${count} currency(ies) found.`);
    }
  });
}
