import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializePbApi, validateAccountId, withRetry } from '../utils.js';
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
          accountId = parsed[0].accountId || parsed[0].accountId;
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
    throw new CliError(ERROR_CODES.MISSING_ACCOUNT_ID, 'Account ID is required. Provide it as an argument or via stdin.');
  }
  
  // Validate account ID format
  validateAccountId(accountId);
  
  if (!isPiped) {
    printTitleBox();
  }
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '💳 fetching balances...').start();
  const api = await initializePbApi(credentials, options);

  // Use retry logic with rate limit handling
  const result = await withRetry(
    () => api.getAccountBalances(accountId),
    {
      maxRetries: 3,
      verbose: options.verbose,
    }
  );
  spinner.stop();

  // Always use structured output when piped or when explicitly requested
  if (options.json || options.yaml || options.output || isPiped) {
    await formatOutput(result.data, { json: options.json, yaml: options.yaml, output: options.output });
    return;
  }

  // Default formatted text output (only when not piped)
  console.log(`Account Id ${result.data.accountId}`);
  console.log(`Currency: ${result.data.currency}`);
  console.log('Balances:');
  console.log(`Current: ${result.data.currentBalance}`);
  console.log(`Available: ${result.data.availableBalance}`);
  console.log(`Budget: ${result.data.budgetBalance}`);
  console.log(`Straight: ${result.data.straightBalance}`);
  console.log(`Cash: ${result.data.cashBalance}`);
}
