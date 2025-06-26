import { credentials, initializePbApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}

export async function beneficiariesCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching beneficiaries...").start();
    const api = await initializePbApi(credentials, options);

    const result = await api.getBeneficiaries();
    const beneficiaries = result.data;
    spinner.stop();
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
