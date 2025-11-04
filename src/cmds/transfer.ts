import { input } from '@inquirer/prompts';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, initializePbApi } from '../utils.js';
import type { CommonOptions } from './types.js';

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
  amount: number,
  reference: string,
  options: CommonOptions
) {
  // Prompt for missing arguments interactively
  if (!accountId) {
    accountId = await input({ message: 'Enter your account ID:' });
  }
  if (!beneficiaryAccountId) {
    beneficiaryAccountId = await input({
      message: 'Enter beneficiary account ID:',
    });
  }
  if (!amount) {
    const amt = await input({ message: 'Enter amount (in rands):' });
    amount = parseFloat(amt);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Please enter a valid positive amount');
    }
  }
  if (!reference) {
    reference = await input({ message: 'Enter reference for the transfer:' });
  }
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '💳 transfering...');
  const api = await initializePbApi(credentials, options);

  const result = await api.transferMultiple(accountId, [
    {
      beneficiaryAccountId: beneficiaryAccountId,
      amount: amount.toString(),
      myReference: reference,
      theirReference: reference,
    },
  ]);
  spinner.stop();
  for (const transfer of result.data.TransferResponses) {
    console.log(`Transfer to ${transfer.BeneficiaryAccountId}: ${transfer.Status}`);
  }
}
