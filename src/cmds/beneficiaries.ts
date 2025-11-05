import { credentials, printTitleBox } from '../index.js';
import { createSpinner, formatOutput, initializePbApi } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Fetches and displays a list of beneficiaries.
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or API call fails
 */
export async function beneficiariesCommand(options: CommonOptions) {
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }
  const disableSpinner = options.spinner === true || isPiped; // Disable spinner when piped
  const spinner = createSpinner(!disableSpinner, '💳 fetching beneficiaries...').start();
  const api = await initializePbApi(credentials, options);

  const result = await api.getBeneficiaries();
  const beneficiaries = result.data;
  spinner.stop();
  if (!beneficiaries) {
    if (!isPiped) {
      console.log('No beneficiaries found');
    } else {
      process.stdout.write('[]\n');
    }
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

  // Use full beneficiaries data when piped or structured output requested
  const dataToOutput =
    options.json || options.yaml || options.output || isPiped ? beneficiaries : simpleBeneficiaries;
  await formatOutput(
    dataToOutput,
    { json: options.json, yaml: options.yaml, output: options.output },
    (count) => {
      if (!isPiped) {
        console.log(`\n${count} beneficiary(ies) found.`);
      }
    }
  );
}
