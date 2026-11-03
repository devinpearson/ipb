import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  initializePbApi,
  isStdoutPiped,
  readStdin,
  runListCommand,
  validateAccountId,
  withCommandSpinner,
  withRetry,
} from '../utils.js';
import type { CommonOptions, Transaction } from './types.js';

/**
 * Fetch and display transactions for a given account.
 * @param accountId - The account ID to fetch transactions for.
 * @param options - CLI options.
 */
export async function transactionsCommand(accountId: string, options: CommonOptions) {
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

  let transactions: Transaction[] | undefined;
  await withCommandSpinner(options, isPiped, '💳 fetching transactions...', async (verbose) => {
    const api = await initializePbApi(credentials, options);
    const result = await withRetry(() => api.getAccountTransactions(accountId), { verbose });
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
