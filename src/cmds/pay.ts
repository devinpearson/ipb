import chalk from "chalk";
import { credentials, initializePbApi } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}

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
    //console.log(result.data.TransferResponses);

    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to make payment:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
