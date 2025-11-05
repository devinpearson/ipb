import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of merchants.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function merchantsCommand(options: CommonOptions) {
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '🏪 fetching merchants...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getMerchants();
  const merchants = result.data.result;
  spinner.stop();
  if (!merchants) {
    if (!isPiped) {
      console.log('No merchants found');
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  const simpleMerchants = merchants.map(({ Code, Name }) => ({ Code, Name }));

  // Use full merchants data when piped or structured output requested
  const dataToOutput =
    options.json || options.yaml || options.output || isPiped ? merchants : simpleMerchants;
  await formatOutput(
    dataToOutput,
    { json: options.json, yaml: options.yaml, output: options.output },
    (count) => {
      if (!isPiped) {
        console.log(`\n${count} merchant(s) found.`);
      }
    }
  );
}
