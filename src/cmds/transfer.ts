import { credentials, initializePbApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import { input, password } from "@inquirer/prompts";
import ora from "ora";

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
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid positive amount");
      }
    }
    if (!reference) {
      reference = await input({ message: "Enter reference for the transfer:" });
    }
    printTitleBox();
    const spinner = ora("💳 transfering...").start();
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
        `Transfer to ${transfer.BeneficiaryAccountId}, reference ${transfer.PaymentReferenceNumber} was successful.`,
      );
    }
  } catch (error: any) {
    handleCliError(error, options, "transfer");
  }
}
