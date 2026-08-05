import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  createSpinner,
  initializeMauApi,
  isStdoutPiped,
  resolveSpinnerState,
  runListCommand,
  validateDateRange,
  validateMauAccountId,
  withRetry,
  withSpinner,
} from '../../utils.js';
import type { MauOptions } from '../types.js';
import { resolveMauAccountId } from './helpers.js';

interface MauTransactionsOptions extends MauOptions {
  from?: string;
  to?: string;
}

/**
 * Fetch and display Mauritius (MAU) account transactions for a date range.
 * @param accountId - MAU account ID
 * @param options - CLI options including --from / --to
 */
export async function mauTransactionsCommand(accountId: string, options: MauTransactionsOptions) {
  const isPiped = isStdoutPiped();
  const resolvedId = validateMauAccountId(await resolveMauAccountId(accountId));
  const { fromDate, toDate } = validateDateRange(options.from, options.to);

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching MAU transactions...');
  let transactions:
    | Array<{
        description: string;
        creditAmount: number;
        debitAmount: number;
        transactionDate: string;
        bankReference: string;
        amount: number;
        runningBalance: number;
        postDate?: string;
      }>
    | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeMauApi(credentials, options);
    const result = await withRetry(() => api.getAccountTransactions(resolvedId, fromDate, toDate), {
      maxRetries: 3,
      verbose,
    });
    transactions = result.data.transactions;
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
