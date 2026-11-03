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
 * Fetches and displays a list of merchants.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function merchantsCommand(options: ReferenceDataOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  let merchants: Array<{ Code: string; Name: string }> | undefined;
  await withCommandSpinner(options, isPiped, '🏪 fetching merchants...', async (verbose) => {
    const api = await initializeApi(credentials, options);
    const result = await withRetry(() => api.getMerchants(), { verbose });
    merchants = result.data.result;
  });

  await runListCommand({
    isPiped,
    items: filterBySearch(merchants, options.search),
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: options.search ? `No merchants match "${options.search}"` : 'No merchants found',
    countMessage: (count) => `${count} merchant(s) found.`,
    mapSimple: (rows) => rows.map(({ Code, Name }) => ({ Code, Name })),
  });
}
