import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializePbApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: CommonOptions) {
  printTitleBox();
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '💳 fetching accounts...').start();
  const api = await initializePbApi(credentials, options);
  if (options.verbose) console.log('💳 fetching accounts...');
  const result = await api.getAccounts();
  const accounts = result.data.accounts;
  if (!accounts || accounts.length === 0) {
    spinner.stop();
    console.log('No accounts found');
    return;
  }

  const simpleAccounts = accounts.map(
    ({ accountId, accountNumber, referenceName, productName }) => ({
      accountId,
      accountNumber,
      referenceName,
      productName,
    })
  );

  spinner.stop();

  // Use raw accounts for structured output, simplified for table
  const dataToOutput = options.json || options.yaml || options.output ? accounts : simpleAccounts;
  await formatOutput(dataToOutput, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    console.log(`\n${count} account(s) found.`);
  });
}
