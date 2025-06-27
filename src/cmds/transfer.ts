import { credentials, printTitleBox } from "../index.js";
import { initializePbApi } from "../utils.js";
import { handleCliError, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";
import { input } from "@inquirer/prompts";

export async function transferCommand(
  accountId: string,
  beneficiaryAccountId: string,
  amount: number,
  reference: string,
  options: CommonOptions,
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
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid positive amount");
      }
    }
    if (!reference) {
      reference = await input({ message: "Enter reference for the transfer:" });
    }
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(!disableSpinner, "💳 transfering...");
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
      console.log(
        `Transfer to ${transfer.BeneficiaryAccountId}: ${transfer.Status}`,
      );
    }
  } catch (error: any) {
    handleCliError(error, options, "transfer");
  }
}
