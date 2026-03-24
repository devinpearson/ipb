import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializePbApi,
  resolveSpinnerState,
  runListCommand,
  withSpinner,
  withRetry,
} from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: CommonOptions) {
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
  const spinner = createSpinner(spinnerEnabled, '💳 fetching accounts...');
  let accounts:
    | Array<{
        accountId: string;
        accountNumber: string;
        referenceName: string;
        productName: string;
      }>
    | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializePbApi(credentials, options);
    if (verbose && !isPiped) console.log('💳 fetching accounts...');

    // Use retry logic with rate limit handling
    const result = await withRetry(() => api.getAccounts(), {
      maxRetries: 3,
      verbose,
    });
    accounts = result.data.accounts;
  });

  await runListCommand({
    isPiped,
    items: accounts,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No accounts found',
    countMessage: (count) => `${count} account(s) found.`,
    mapSimple: (rows) =>
      rows.map(({ accountId, accountNumber, referenceName, productName }) => ({
        accountId,
        accountNumber,
        referenceName,
        productName,
      })),
  });
}
