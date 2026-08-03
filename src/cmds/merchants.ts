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
 * Fetches and displays a list of merchants.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function merchantsCommand(options: CommonOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🏪 fetching merchants...');
  let merchants:
    | Array<{
        Code: string;
        Name: string;
      }>
    | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);

    const result = await withRetry(() => api.getMerchants(), {
      maxRetries: 3,
      verbose,
    });
    merchants = result.data.result;
  });

  await runListCommand({
    isPiped,
    items: merchants,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No merchants found',
    countMessage: (count) => `${count} merchant(s) found.`,
    mapSimple: (rows) => rows.map(({ Code, Name }) => ({ Code, Name })),
  });
}
