import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializePbApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: CommonOptions) {
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  
  if (!isPiped) {
    printTitleBox();
  }
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '💳 fetching accounts...');
  if (!isPiped) {
    spinner.start();
  }
  const api = await initializePbApi(credentials, options);
  if (options.verbose && !isPiped) console.log('💳 fetching accounts...');
  const result = await api.getAccounts();
  const accounts = result.data.accounts;
  if (!accounts || accounts.length === 0) {
    if (!isPiped) {
      spinner.stop();
      console.log('No accounts found');
    } else {
      process.stdout.write('[]\n');
    }
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

  if (!isPiped) {
    spinner.stop();
  }

  // Use raw accounts for structured output, simplified for table
  const dataToOutput = options.json || options.yaml || options.output || isPiped ? accounts : simpleAccounts;
  await formatOutput(dataToOutput, { json: options.json, yaml: options.yaml, output: options.output }, (count) => {
    if (!isPiped) {
      console.log(`\n${count} account(s) found.`);
    }
  });
}
