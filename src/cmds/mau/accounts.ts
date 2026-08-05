import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  createSpinner,
  initializeMauApi,
  isStdoutPiped,
  resolveSpinnerState,
  runListCommand,
  withRetry,
  withSpinner,
} from '../../utils.js';
import type { MauOptions } from '../types.js';

/**
 * List Mauritius (MAU) Investec accounts.
 * @param options - CLI options including MAU credentials
 */
export async function mauAccountsCommand(options: MauOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching MAU accounts...');
  let accounts:
    | Array<{
        accountId: number;
        accountNumber: string;
        accountName?: string;
        accountCurrency: string;
        profileId: number;
        profileName: string;
      }>
    | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeMauApi(credentials, options);
    if (verbose && !isPiped) console.log('💳 fetching MAU accounts...');

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
    emptyMessage: 'No MAU accounts found',
    countMessage: (count) => `${count} MAU account(s) found.`,
    mapSimple: (rows) =>
      rows.map(({ accountId, accountNumber, accountName, accountCurrency, profileName }) => ({
        accountId,
        accountNumber,
        accountName: accountName ?? '',
        accountCurrency,
        profileName,
      })),
  });
}
