import { credentials, initializePbApi, printTable } from "../index.js";
import { handleCliError } from "./utils.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}

export async function beneficiariesCommand(options: Options) {
  try {
    const api = await initializePbApi(credentials, options);

    console.log("💳 fetching beneficiaries");
    const result = await api.getBeneficiaries();
    const beneficiaries = result.data;
    console.log("");
    if (!beneficiaries) {
      console.log("No beneficiaries found");
      return;
    }
    const simpleBeneficiaries = beneficiaries.map(
      ({ beneficiaryId, accountNumber, beneficiaryName, lastPaymentDate }) => ({
        beneficiaryId,
        accountNumber,
        beneficiaryName,
        lastPaymentDate,
      }),
    );
    printTable(simpleBeneficiaries);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch beneficiaries");
  }
}
