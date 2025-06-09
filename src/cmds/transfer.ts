import { credentials, initializePbApi } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import { input, password } from "@inquirer/prompts";

interface Options extends CommonOptions {}

export async function transferCommand(
  accountId: string,
  beneficiaryAccountId: string,
  amount: number,
  reference: string,
  options: Options,
) {
  try {
    // Prompt for missing arguments interactively
    if (!accountId) {
      accountId = await input({ message: "Enter your account ID:" });
    }
    if (!beneficiaryAccountId) {
      beneficiaryAccountId = await input({
        message: "Enter beneficiary account ID:",
      });
    }
    if (!amount) {
      const amt = await input({ message: "Enter amount (in rands):" });
      amount = parseFloat(amt);
    }
    if (!reference) {
      reference = await input({ message: "Enter reference for the transfer:" });
    }

    const api = await initializePbApi(credentials, options);

    console.log("💳 transfering");
    const result = await api.transferMultiple(accountId, [
      {
        beneficiaryAccountId: beneficiaryAccountId,
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
    handleCliError(error, options, "transfer");
  }
}
