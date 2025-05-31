import { credentials, initializePbApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {}

/**
 * Fetch and display Investec beneficiaries.
 * @param options CLI options
 */
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
      }: {
        beneficiaryId: string;
        accountNumber: string;
        beneficiaryName: string;
        lastPaymentDate: string;
      }) => ({
        beneficiaryId,
        accountNumber,
        beneficiaryName,
        lastPaymentDate,
      }),
    );
    printTable(simpleBeneficiaries);
  } catch (error: any) {
    handleCliError(error, options, "fetch beneficiaries");
  }
}
