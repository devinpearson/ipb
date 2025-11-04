import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializePbApi, printTable } from '../utils.js';
import type { CommonOptions } from './types.js';

export async function beneficiariesCommand(options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '💳 fetching beneficiaries...').start();
    const api = await initializePbApi(credentials, options);

    const result = await api.getBeneficiaries();
    const beneficiaries = result.data;
    spinner.stop();
    if (!beneficiaries) {
      console.log('No beneficiaries found');
      return;
    }
    const simpleBeneficiaries = beneficiaries.map(
      ({
        beneficiaryId,
        accountNumber,
        beneficiaryName,
        lastPaymentDate,
        lastPaymentAmount,
        referenceName,
      }) => ({
        beneficiaryId,
        accountNumber,
        beneficiaryName,
        lastPaymentDate,
        lastPaymentAmount,
        referenceName,
      })
    );
    printTable(simpleBeneficiaries);
    console.log(`\n${beneficiaries.length} beneficiary(ies) found.`);
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch beneficiaries');
  }
}
