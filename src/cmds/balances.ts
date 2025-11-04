import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializePbApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays account balances for a specific account.
 * @param accountId - The account ID to fetch balances for
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function balancesCommand(accountId: string, options: CommonOptions) {
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '💳 fetching balances...').start();
  const api = await initializePbApi(credentials, options);

  const result = await api.getAccountBalances(accountId);
  spinner.stop();

  if (options.json || options.yaml || options.output) {
    await formatOutput(result.data, { json: options.json, yaml: options.yaml, output: options.output });
    return;
  }

  // Default formatted text output
  console.log(`Account Id ${result.data.accountId}`);
  console.log(`Currency: ${result.data.currency}`);
  console.log('Balances:');
  console.log(`Current: ${result.data.currentBalance}`);
  console.log(`Available: ${result.data.availableBalance}`);
  console.log(`Budget: ${result.data.budgetBalance}`);
  console.log(`Straight: ${result.data.straightBalance}`);
  console.log(`Cash: ${result.data.cashBalance}`);
}
