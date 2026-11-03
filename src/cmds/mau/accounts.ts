import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  initializeMauApi,
  isStdoutPiped,
  runListCommand,
  withCommandSpinner,
  withRetry,
} from '../../utils.js';
import type { MauAccount, MauOptions } from '../types.js';
import { extractMauAccounts } from './helpers.js';

/**
 * List Mauritius (MAU) Investec accounts.
 * @param options - CLI options including MAU credentials
 */
export async function mauAccountsCommand(options: MauOptions) {
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  let accounts: MauAccount[] | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching MAU accounts...', async (verbose) => {
    const api = await initializeMauApi(credentials, options);
    const result = await withRetry(() => api.getAccounts(), { verbose });
    accounts = extractMauAccounts(result);
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
