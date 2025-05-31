import { credentials, initializePbApi } from "@src/index.js";
import { handleCliError } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

export async function payCommand(
  accountId: string,
  beneficiaryId: string,
  amount: number,
  reference: string,
  options: Options,
) {
  try {
    const api = await initializePbApi(credentials, options);

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
