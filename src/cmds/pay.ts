import { input } from '@inquirer/prompts';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  getSafeText,
  initializePbApi,
  isStdoutPiped,
  resolveSpinnerState,
  validateAccountId,
  validateAmount,
  withRetry,
  withSpinner,
} from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Pays a beneficiary from an account.
 * @param accountId - The account ID to transfer from
 * @param beneficiaryId - The beneficiary ID to pay
 * @param amount - Amount to transfer in rands (e.g. 100.00)
 * @param reference - Reference for the payment
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid, payment fails, or confirmation is not provided
 */
export async function payCommand(
  accountId: string,
  beneficiaryId: string,
  amount: number,
  reference: string,
  options: CommonOptions
) {
  // Prompt for missing arguments interactively
  if (!accountId) {
    accountId = await input({ message: 'Enter your account ID:' });
  }
  validateAccountId(accountId);

  if (!beneficiaryId) {
    beneficiaryId = await input({ message: 'Enter beneficiary ID:' });
  }
  // Beneficiary ID validation (similar format to account ID)
  if (!beneficiaryId || beneficiaryId.trim().length === 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Beneficiary ID is required');
  }

  if (!amount) {
    const amt = await input({ message: 'Enter amount (in rands):' });
    amount = parseFloat(amt);
  }
  validateAmount(amount);

  if (!reference) {
    reference = await input({ message: 'Enter reference for the payment:' });
  }

  const isPiped = isStdoutPiped();
  if (!isPiped) {
    printTitleBox();
  }

  const api = await initializePbApi(credentials, options);

  // Show transaction summary and require confirmation
  console.log(`\nTransaction Summary:`);
  console.log('-------------------------');
  console.log(`Account: ${accountId}`);
  console.log(`Beneficiary: ${beneficiaryId}`);
  console.log(`Amount: R${amount.toFixed(2)}`);
  console.log(`Reference: ${reference}\n`);

  const confirmed = await confirmDestructiveOperation(
    'This will make a payment from your account. Continue?',
    { yes: options.yes }
  );

  if (!confirmed) {
    console.log('Payment cancelled.');
    return;
  }

  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, getSafeText('💳 paying...'));

  const result = await withSpinner(spinner, spinnerEnabled, async () =>
    withRetry(
      () =>
        api.payMultiple(accountId, [
          {
            beneficiaryId: beneficiaryId,
            amount: amount.toString(),
            myReference: reference,
            theirReference: reference,
          },
        ]),
      {
        maxRetries: 3,
        verbose: options.verbose,
      }
    )
  );
  for (const transfer of result.data.TransferResponses) {
    console.log(
      `Transfer to ${transfer.BeneficiaryAccountId}, reference ${transfer.PaymentReferenceNumber} was successful.`
    );
  }
}
