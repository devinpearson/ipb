import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  formatOutput,
  initializeApi,
  resolveSpinnerState,
  stopSpinner,
  withRetry,
} from '../utils.js';
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
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching currencies...');
  if (spinnerEnabled) {
    spinner.start();
  }
  let currencies:
    | Array<{
        Code: string;
        Name: string;
      }>
    | undefined;
  try {
    const api = await initializeApi(credentials, options);

    const result = await withRetry(() => api.getCurrencies(), {
      maxRetries: 3,
      verbose,
    });
    currencies = result.data.result;
  } finally {
  stopSpinner(spinner, spinnerEnabled);
  }

  if (!currencies || currencies.length === 0) {
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
  const dataToOutput =
    options.json || options.yaml || options.output || isPiped ? currencies : simpleCurrencies;
  await formatOutput(
    dataToOutput,
    { json: options.json, yaml: options.yaml, output: options.output },
    (count) => {
      if (!isPiped) {
        console.log(`\n${count} currency(ies) found.`);
      }
    }
  );
}
