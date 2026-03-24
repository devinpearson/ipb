import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  formatOutput,
  initializePbApi,
  resolveSpinnerState,
  stopSpinner,
  withRetry,
} from '../utils.js';
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
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching accounts...');
  if (spinnerEnabled) {
    spinner.start();
  }

  let accounts:
    | Array<{
        accountId: string;
        accountNumber: string;
        referenceName: string;
        productName: string;
      }>
    | undefined;

  try {
    const api = await initializePbApi(credentials, options);
    if (verbose && !isPiped) console.log('💳 fetching accounts...');

    // Use retry logic with rate limit handling
    const result = await withRetry(() => api.getAccounts(), {
      maxRetries: 3,
      verbose,
    });
    accounts = result.data.accounts;
  } finally {
    stopSpinner(spinner, spinnerEnabled);
  }

  if (!accounts || accounts.length === 0) {
    if (!isPiped) {
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

  // Use raw accounts for structured output, simplified for table
  const dataToOutput =
    options.json || options.yaml || options.output || isPiped ? accounts : simpleAccounts;
  await formatOutput(
    dataToOutput,
    { json: options.json, yaml: options.yaml, output: options.output },
    (count) => {
      if (!isPiped) {
        console.log(`\n${count} account(s) found.`);
      }
    }
  );
}
