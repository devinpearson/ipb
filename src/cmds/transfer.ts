import { credentials, initializePbApi } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {}

export async function transferCommand(
  accountId: string,
  beneficiaryAccountId: string,
  amount: number,
  reference: string,
  options: Options,
) {
  try {
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
    //console.log(result.data.TransferResponses);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "transfer");
  }
}
