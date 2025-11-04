import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi, printTable } from '../utils.js';
import type { CommonOptions } from './types.js';

export async function currenciesCommand(options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '💳 fetching currencies...').start();
    const api = await initializeApi(credentials, options);

    const result = await api.getCurrencies();
    spinner.stop();
    const currencies = result.data.result;
    if (!currencies) {
      console.log('No currencies found');
      return;
    }

    const simpleCurrencies = currencies.map(({ Code, Name }) => ({
      Code,
      Name,
    }));
    printTable(simpleCurrencies);
    console.log(`\n${currencies.length} currency(ies) found.`);
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch currencies');
  }
}
