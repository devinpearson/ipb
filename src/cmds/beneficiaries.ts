import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializePbApi,
  resolveSpinnerState,
  runListCommand,
  withRetry,
  withSpinner,
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

  await runListCommand({
    isPiped,
    items: beneficiaries,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No beneficiaries found',
    countMessage: (count) => `${count} beneficiary(ies) found.`,
    mapSimple: (rows) =>
      rows.map(
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
      ),
  });
}
