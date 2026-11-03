import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  defaultMauTransactionDateRange,
  initializeMauApi,
  isStdoutPiped,
  runListCommand,
  validateDateRange,
  validateMauAccountId,
  withCommandSpinner,
  withRetry,
} from '../../utils.js';
import type { MauOptions, MauTransaction } from '../types.js';
import { extractMauDataList, resolveMauAccountId } from './helpers.js';

interface MauTransactionsOptions extends MauOptions {
  from?: string;
  to?: string;
}

/**
 * Fetch and display Mauritius (MAU) account transactions for a date range.
 * Defaults to the last 3 months when --from / --to are omitted.
 * @param accountId - MAU account ID
 * @param options - CLI options including optional --from / --to
 */
export async function mauTransactionsCommand(accountId: string, options: MauTransactionsOptions) {
  const isPiped = isStdoutPiped();
  const resolvedId = validateMauAccountId(await resolveMauAccountId(accountId));
  const { fromDate, toDate } = validateDateRange(
    options.from,
    options.to,
    defaultMauTransactionDateRange()
  );

  if (!isPiped) {
    printTitleBox();
  }

  let transactions: MauTransaction[] | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching MAU transactions...', async (verbose) => {
    const api = await initializeMauApi(credentials, options);
    const result = await withRetry(() => api.getAccountTransactions(resolvedId, fromDate, toDate), {
      verbose,
    });
    transactions = extractMauDataList(result, 'transactions');
  });

  await runListCommand({
    isPiped,
    items: transactions,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No MAU transactions found',
    countMessage: (count) => `${count} MAU transaction(s) found.`,
    mapSimple: (rows) =>
      rows.map(
        ({ transactionDate, description, amount, creditAmount, debitAmount, bankReference }) => ({
          transactionDate,
          description,
          amount,
          creditAmount,
          debitAmount,
          bankReference,
        })
      ),
  });
}
