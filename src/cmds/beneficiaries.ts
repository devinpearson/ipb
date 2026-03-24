import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  formatOutput,
  initializePbApi,
  resolveSpinnerState,
  withSpinner,
  withRetry,
} from '../utils.js';
import type { CommonOptions } from './types.js';

type BeneficiarySummary = {
  beneficiaryId: string;
  accountNumber: string;
  beneficiaryName: string;
  lastPaymentDate: string;
  lastPaymentAmount: string | number;
  referenceName: string;
};

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
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching beneficiaries...');
  let beneficiaries: BeneficiarySummary[] | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializePbApi(credentials, options);

    const result = await withRetry(() => api.getBeneficiaries(), {
      maxRetries: 3,
      verbose,
    });
    beneficiaries = result.data as BeneficiarySummary[];
  });

  if (!beneficiaries || beneficiaries.length === 0) {
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
