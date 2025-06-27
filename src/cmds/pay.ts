import { credentials, printTitleBox } from "../index.js";
import { initializePbApi } from "../utils.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import { input } from "@inquirer/prompts";

export async function payCommand(
  accountId: string,
  beneficiaryId: string,
  amount: number,
  reference: string,
  options: CommonOptions,
) {
  try {
    // Prompt for missing arguments interactively
    if (!accountId) {
      accountId = await input({ message: "Enter your account ID:" });
    }
    if (!beneficiaryId) {
      beneficiaryId = await input({ message: "Enter beneficiary ID:" });
    }
    if (!amount) {
      const amt = await input({ message: "Enter amount (in rands):" });
      amount = parseFloat(amt);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number");
      }
    }
    if (!reference) {
      reference = await input({ message: "Enter reference for the payment:" });
    }
    printTitleBox();
    const api = await initializePbApi(credentials, options);

    // Show transaction summary and require confirmation
    console.log(`\nTransaction Summary:`);
    console.log("-------------------------");
    console.log(`Account: ${accountId}`);
    console.log(`Beneficiary: ${beneficiaryId}`);
    console.log(`Amount: R${amount.toFixed(2)}`);
    console.log(`Reference: ${reference}\n`);

    const confirmPayment = await input({
      message: "Type 'CONFIRM' to proceed with this payment:",
    });
    if (confirmPayment !== "CONFIRM") {
      console.log("Payment cancelled.");
      return;
    }

    console.log("💳 paying");
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
        `Transfer to ${transfer.BeneficiaryAccountId}, reference ${transfer.PaymentReferenceNumber} was successful.`,
      );
    }
  } catch (error: any) {
    handleCliError(error, options, "pay beneficiary");
  }
}
