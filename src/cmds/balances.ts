import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializePbApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays account balances for a specific account.
 * @param accountId - The account ID to fetch balances for
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function balancesCommand(accountId: string, options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(!disableSpinner, '💳 fetching balances...').start();
    const api = await initializePbApi(credentials, options);

    const result = await api.getAccountBalances(accountId);
    spinner.stop();
    //console.table(accounts)
    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2));
      return;
    } else {
      console.log(`Account Id ${result.data.accountId}`);
      console.log(`Currency: ${result.data.currency}`);
      console.log('Balances:');
      console.log(`Current: ${result.data.currentBalance}`);
      console.log(`Available: ${result.data.availableBalance}`);
      console.log(`Budget: ${result.data.budgetBalance}`);
      console.log(`Straight: ${result.data.straightBalance}`);
      console.log(`Cash: ${result.data.cashBalance}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Bad Request') {
      console.log('');
      console.error(`Account with ID ${accountId} not found.`);
    } else {
      handleCliError(error, options, 'fetch balances');
    }
  }
}
