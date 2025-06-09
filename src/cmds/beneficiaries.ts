import { credentials, initializePbApi } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {}

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
      ({
        beneficiaryId,
        accountNumber,
        beneficiaryName,
        lastPaymentDate,
        lastPaymentAmount,
        referenceName,
      }) => ({
        beneficiaryId,
        accountNumber,
        beneficiaryName,
        lastPaymentDate,
        lastPaymentAmount,
        referenceName,
      }),
    );
    printTable(simpleBeneficiaries);
  } catch (error: any) {
    handleCliError(error, options, "fetch beneficiaries");
  }
}
