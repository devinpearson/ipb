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
 * Fetches and displays a list of supported countries.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function countriesCommand(options: ReferenceDataOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  let countries: Array<{ Code: string; Name: string }> | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching countries...', async (verbose) => {
    const api = await initializeApi(credentials, options);
    const result = await withRetry(() => api.getCountries(), { verbose });
    countries = result.data.result;
  });

  await runListCommand({
    isPiped,
    items: filterBySearch(countries, options.search),
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: options.search ? `No countries match "${options.search}"` : 'No countries found',
    countMessage: (count) => `${count} country(ies) found.`,
    mapSimple: (rows) => rows.map(({ Code, Name }) => ({ Code, Name })),
  });
}
