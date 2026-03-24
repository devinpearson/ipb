import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializePbApi,
  resolveSpinnerState,
  runListCommand,
  validateAccountId,
  withRetry,
  withSpinner,
} from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Minimal transaction type for CLI display.
 */
type Transaction = {
  uuid: string;
  amount: number;
  transactionDate: string;
  description: string;
  // ...other fields can be added as needed
};

/**
 * Fetch and display transactions for a given account.
 * @param accountId - The account ID to fetch transactions for.
 * @param options - CLI options.
 */
export async function transactionsCommand(accountId: string, options: CommonOptions) {
  const { isStdoutPiped, readStdin } = await import('../utils.js');
  const isPiped = isStdoutPiped();

  // If accountId is not provided and stdin has data, try to read from stdin
  if (!accountId || accountId.trim() === '') {
    const stdinData = await readStdin();
    if (stdinData) {
      try {
        const parsed = JSON.parse(stdinData);
        // If stdin is an array, take the first accountId
        if (Array.isArray(parsed) && parsed.length > 0) {
          accountId = parsed[0].accountId;
        } else if (parsed.accountId) {
          accountId = parsed.accountId;
        } else if (typeof parsed === 'string') {
          accountId = parsed;
        }
      } catch {
        // If not JSON, treat as plain accountId
        accountId = stdinData.trim();
      }
    }
  }

  if (!accountId || accountId.trim() === '') {
    const { CliError, ERROR_CODES } = await import('../errors.js');
    throw new CliError(
      ERROR_CODES.MISSING_ACCOUNT_ID,
      'Account ID is required. Provide it as an argument or via stdin.'
    );
  }

  // Validate account ID format
  validateAccountId(accountId);

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching transactions...');
  let transactions: Transaction[] | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializePbApi(credentials, options);

    // Use retry logic with rate limit handling
    const result = await withRetry(() => api.getAccountTransactions(accountId), {
      maxRetries: 3,
      verbose,
    });
    transactions = result.data.transactions;
  });

  if (!transactions || transactions.length === 0) {
    if (!isPiped) {
      console.log('No transactions found');
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  await runListCommand({
    isPiped,
    items: transactions,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No transactions found',
    countMessage: (count) => `${count} transaction(s) found.`,
    mapSimple: (rows) =>
      rows.map(({ uuid, amount, transactionDate, description }: Transaction) => ({
        uuid,
        amount,
        transactionDate,
        description,
      })),
  });
}
