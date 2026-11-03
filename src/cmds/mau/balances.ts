import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  initializeMauApi,
  isStdoutPiped,
  runListCommand,
  validateMauAccountId,
  withCommandSpinner,
  withRetry,
} from '../../utils.js';
import type { MauBalance, MauOptions } from '../types.js';
import { extractMauBalance, resolveMauAccountId } from './helpers.js';

/**
 * Fetch and display Mauritius (MAU) account balances.
 * @param accountId - MAU account ID
 * @param options - CLI options including MAU credentials
 */
export async function mauBalancesCommand(accountId: string, options: MauOptions) {
  const isPiped = isStdoutPiped();
  const resolvedId = validateMauAccountId(await resolveMauAccountId(accountId));

  if (!isPiped) {
    printTitleBox();
  }

  let balance: MauBalance | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching MAU balances...', async (verbose) => {
    const api = await initializeMauApi(credentials, options);
    const result = await withRetry(() => api.getAccountBalances(resolvedId), { verbose });
    balance = extractMauBalance(result);
  });

  if (!balance) {
    return;
  }

  await runListCommand({
    isPiped,
    items: [balance],
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No MAU balances found',
    countMessage: () => '1 MAU balance record found.',
    mapSimple: (rows) =>
      rows.map((row) => ({
        accountNumber: row.accountNumber,
        accountType: row.accountType,
        accountShortName: row.accountShortName,
        currency: row.currency,
        balance: row.balance,
        availableBalance: row.availableBalance,
        encumbrances: row.encumbrances,
      })),
  });
}
