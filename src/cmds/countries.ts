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
 * Fetches and displays a list of supported countries.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function countriesCommand(options: CommonOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching countries...');
  let countries:
    | Array<{
        Code: string;
        Name: string;
      }>
    | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);

    const result = await withRetry(() => api.getCountries(), {
      maxRetries: 3,
      verbose,
    });
    countries = result.data.result;
  });

  await runListCommand({
    isPiped,
    items: countries,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No countries found',
    countMessage: (count) => `${count} country(ies) found.`,
    mapSimple: (rows) => rows.map(({ Code, Name }) => ({ Code, Name })),
  });
}
