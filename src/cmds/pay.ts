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
import {
  assertCanConfirm,
  describeBeneficiary,
  describeOwnAccounts,
  humanLog,
  printSummary,
  reportTransferResults,
  writeJson,
} from './payment-helpers.js';
import type { PaymentOptions } from './types.js';

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
  amount: number | string,
  reference: string,
  options: PaymentOptions
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

  // Commander passes args as strings; coerce before validation/formatting.
  if (!amount) {
    amount = await input({ message: 'Enter amount (in rands):' });
  }
  amount = validateAmount(amount);

  if (!reference) {
    reference = await input({ message: 'Enter reference for the payment:' });
  }

  const isPiped = isStdoutPiped();
  const log = humanLog(options.json);
  if (!isPiped) {
    printTitleBox();
  }

  const api = await initializePbApi(credentials, options);
  const [fromLabel = accountId] = await describeOwnAccounts(api, [accountId]);
  const beneficiary = await describeBeneficiary(api, beneficiaryId);

  printSummary(log, options.dryRun ? 'Payment Summary (dry run)' : 'Payment Summary', [
    ['From', fromLabel],
    ['To', beneficiary.label ?? `${beneficiaryId} (name not found — check this ID carefully)`],
    ['Amount', `R${amount.toFixed(2)}`],
    ['Reference', reference],
  ]);

  if (options.dryRun) {
    log('Dry run: account and beneficiary checked, nothing was sent.');
    if (options.json) {
      writeJson({ dryRun: true, accountId, beneficiaryId, amount: amount.toFixed(2), reference });
    }
    return;
  }

  assertCanConfirm(options.yes, 'payment');
  const confirmed = await confirmDestructiveOperation(
    'This will make a payment from your account. Continue?',
    { yes: options.yes }
  );

  if (!confirmed) {
    log('Payment cancelled.');
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
      { verbose: options.verbose }
    )
  );
  if (options.json) {
    writeJson(result.data.TransferResponses ?? []);
  }
  reportTransferResults(result.data.TransferResponses, 'Payment', log);
}
