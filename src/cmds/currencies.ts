import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  createSpinner,
  initializeApi,
  isStdoutPiped,
  resolveSpinnerState,
  runListCommand,
  withRetry,
  withSpinner,
} from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of supported currencies.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function currenciesCommand(options: CommonOptions) {
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
  let currencies:
    | Array<{
        Code: string;
        Name: string;
      }>
    | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);

    const result = await withRetry(() => api.getCurrencies(), {
      maxRetries: 3,
      verbose,
    });
    currencies = result.data.result;
  });

  await runListCommand({
    isPiped,
    items: currencies,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No currencies found',
    countMessage: (count) => `${count} currency(ies) found.`,
    mapSimple: (rows) => rows.map(({ Code, Name }) => ({ Code, Name })),
  });
}
