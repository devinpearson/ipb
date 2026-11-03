import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  initializePbApi,
  isStdoutPiped,
  runListCommand,
  withCommandSpinner,
  withRetry,
} from '../utils.js';
import type { Account, CommonOptions } from './types.js';

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: CommonOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  let accounts: Account[] | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching accounts...', async (verbose) => {
    const api = await initializePbApi(credentials, options);
    const result = await withRetry(() => api.getAccounts(), { verbose });
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
