import { input } from '@inquirer/prompts';
import { credentials, printTitleBox } from '../index.js';
import { initializePbApi } from '../utils.js';
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
  if (!beneficiaryId) {
    beneficiaryId = await input({ message: 'Enter beneficiary ID:' });
  }
  if (!amount) {
    const amt = await input({ message: 'Enter amount (in rands):' });
    amount = parseFloat(amt);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
  }
  if (!reference) {
    reference = await input({ message: 'Enter reference for the payment:' });
  }
  printTitleBox();
  const api = await initializePbApi(credentials, options);

  // Show transaction summary and require confirmation
  console.log(`\nTransaction Summary:`);
  console.log('-------------------------');
  console.log(`Account: ${accountId}`);
  console.log(`Beneficiary: ${beneficiaryId}`);
  console.log(`Amount: R${amount.toFixed(2)}`);
  console.log(`Reference: ${reference}\n`);

  const confirmPayment = await input({
    message: "Type 'CONFIRM' to proceed with this payment:",
  });
  if (confirmPayment !== 'CONFIRM') {
    console.log('Payment cancelled.');
    return;
  }

  console.log('💳 paying');
  const result = await api.payMultiple(accountId, [
    {
      beneficiaryId: beneficiaryId,
      amount: amount.toString(),
      myReference: reference,
      theirReference: reference,
    },
  ]);
  for (const transfer of result.data.TransferResponses) {
    console.log(
      `Transfer to ${transfer.BeneficiaryAccountId}, reference ${transfer.PaymentReferenceNumber} was successful.`
    );
  }
}
