import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializePbApi } from '../utils.js';
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
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '💳 fetching transactions...').start();
  const api = await initializePbApi(credentials, options);

  const result = await api.getAccountTransactions(accountId);
  const transactions = result.data.transactions;
  spinner.stop();
  if (!transactions) {
    console.log('No transactions found');
    return;
  }

  const simpleTransactions = transactions.map(
    ({ uuid, amount, transactionDate, description }: Transaction) => ({
      uuid,
      amount,
      transactionDate,
      description,
    })
  );

  // Use raw transactions for structured output, simplified for table
  const dataToOutput = options.json || options.yaml || options.output ? transactions : simpleTransactions;
  await formatOutput(dataToOutput, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    console.log(`\n${count} transaction(s) found.`);
  });
}
