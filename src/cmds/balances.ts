import { CliError, ERROR_CODES } from '../errors.js';
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
 * Fetches and displays account balances for a specific account.
 * @param accountId - The account ID to fetch balances for
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function balancesCommand(accountId: string, options: CommonOptions) {
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
  const spinner = createSpinner(spinnerEnabled, '💳 fetching balances...');
  let result:
    | {
        data: {
          accountId: string;
          currency: string;
          currentBalance: number;
          availableBalance: number;
          budgetBalance: number;
          straightBalance: number;
          cashBalance: number;
        };
      }
    | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializePbApi(credentials, options);

    // Use retry logic with rate limit handling
    result = await withRetry(() => api.getAccountBalances(accountId), {
      maxRetries: 3,
      verbose,
    });
  });

  if (!result) {
    return;
  }

  // Keep single-record behavior while using shared list output flow.
  await runListCommand({
    isPiped,
    items: [result.data],
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No balances found',
    countMessage: () => '1 balance record found.',
    mapSimple: (rows) =>
      rows.map((row) => ({
        accountId: row.accountId,
        currency: row.currency,
        currentBalance: row.currentBalance,
        availableBalance: row.availableBalance,
        budgetBalance: row.budgetBalance,
        straightBalance: row.straightBalance,
        cashBalance: row.cashBalance,
      })),
  });
}
