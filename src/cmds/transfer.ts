import { input } from '@inquirer/prompts';
import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  initializePbApi,
  isStdoutPiped,
  resolveSpinnerState,
  validateAccountId,
  validateAmount,
  withRetry,
  withSpinnerOutcome,
} from '../utils.js';
import {
  assertCanConfirm,
  describeOwnAccounts,
  humanLog,
  printSummary,
  reportTransferResults,
  writeJson,
} from './payment-helpers.js';
import type { PaymentOptions } from './types.js';

/**
 * Transfers money between accounts.
 * @param accountId - The account ID to transfer from
 * @param beneficiaryAccountId - The beneficiary account ID to transfer to
 * @param amount - Amount to transfer in rands (e.g. 100.00)
 * @param reference - Reference for the transfer
 * @param options - CLI options including API credentials
 * @throws {Error} When API credentials are invalid or transfer fails
 */
export async function transferCommand(
  accountId: string,
  beneficiaryAccountId: string,
  amount: number | string,
  reference: string,
  options: PaymentOptions
) {
  // Prompt for missing arguments interactively
  if (!accountId) {
    accountId = await input({ message: 'Enter your account ID:' });
  }
  accountId = validateAccountId(accountId);

  if (!beneficiaryAccountId) {
    beneficiaryAccountId = await input({
      message: 'Enter beneficiary account ID:',
    });
  }
  beneficiaryAccountId = validateAccountId(beneficiaryAccountId);

  // Commander passes args as strings; coerce before validation/formatting.
  if (!amount) {
    amount = await input({ message: 'Enter amount (in rands):' });
  }
  amount = validateAmount(amount);

  if (!reference) {
    reference = await input({ message: 'Enter reference for the transfer:' });
  }

  printTitleBox();
  const log = humanLog(options.json);
  const api = await initializePbApi(credentials, options);
  const [fromLabel = accountId, toLabel = beneficiaryAccountId] = await describeOwnAccounts(api, [
    accountId,
    beneficiaryAccountId,
  ]);

  printSummary(log, options.dryRun ? 'Transfer Summary (dry run)' : 'Transfer Summary', [
    ['From', fromLabel],
    ['To', toLabel],
    ['Amount', `R${amount.toFixed(2)}`],
    ['Reference', reference],
  ]);

  if (options.dryRun) {
    log('Dry run: both accounts checked, nothing was sent.');
    if (options.json) {
      writeJson({
        dryRun: true,
        accountId,
        beneficiaryAccountId,
        amount: amount.toFixed(2),
        reference,
      });
    }
    return;
  }

  assertCanConfirm(options.yes, 'transfer');
  const confirmed = await confirmDestructiveOperation(
    'This will transfer money between your accounts. Continue?',
    { yes: options.yes }
  );

  if (!confirmed) {
    log('Transfer cancelled.');
    return;
  }

  const isPiped = isStdoutPiped();
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 transferring...');

  const result = await withSpinnerOutcome(spinner, spinnerEnabled, async () => {
    // Use retry logic with rate limit handling
    return await withRetry(
      () =>
        api.transferMultiple(accountId, [
          {
            beneficiaryAccountId: beneficiaryAccountId,
            amount: amount.toString(),
            myReference: reference,
            theirReference: reference,
          },
        ]),
      { verbose }
    );
  });

  if (options.json) {
    writeJson(result.data.TransferResponses ?? []);
  }
  reportTransferResults(result.data.TransferResponses, 'Transfer', log);
}
