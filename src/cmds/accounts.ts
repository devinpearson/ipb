import { credentials, initializePbApi } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";

interface Options extends CommonOptions {}

export async function accountsCommand(options: Options) {
  try {
    const api = await initializePbApi(credentials, options);

    console.log("💳 fetching accounts");
    const result = await api.getAccounts();
    const accounts = result.data.accounts;
    console.log("");
    if (!accounts) {
      console.log("No accounts found");
      return;
    }

    const simpleAccounts = accounts.map(
      ({ accountId, accountNumber, referenceName, productName }) => ({
        accountId,
        accountNumber,
        referenceName,
        productName,
      }),
    );
    printTable(simpleAccounts);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch accounts");
  }
}
