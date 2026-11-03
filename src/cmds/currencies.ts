import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  filterBySearch,
  initializeApi,
  isStdoutPiped,
  runListCommand,
  withCommandSpinner,
  withRetry,
} from '../utils.js';
import type { ReferenceDataOptions } from './types.js';

/**
 * Fetches and displays a list of supported currencies.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function currenciesCommand(options: ReferenceDataOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  let currencies: Array<{ Code: string; Name: string }> | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching currencies...', async (verbose) => {
    const api = await initializeApi(credentials, options);
    const result = await withRetry(() => api.getCurrencies(), { verbose });
    currencies = result.data.result;
  });

  await runListCommand({
    isPiped,
    items: filterBySearch(currencies, options.search),
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: options.search
      ? `No currencies match "${options.search}"`
      : 'No currencies found',
    countMessage: (count) => `${count} currency(ies) found.`,
    mapSimple: (rows) => rows.map(({ Code, Name }) => ({ Code, Name })),
  });
}
