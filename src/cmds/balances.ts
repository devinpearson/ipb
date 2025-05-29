import { credentials, initializePbApi } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
interface Options extends CommonOptions {
  accountId: string;
}

export async function balancesCommand(accountId: string, options: Options) {
  try {
    const api = await initializePbApi(credentials, options);

    console.log("💳 fetching balances");
    const result = await api.getAccountBalances(accountId);
    //console.table(accounts)
    console.log(`Account Id ${result.data.accountId}`);
    console.log(`Currency: ${result.data.currency}`);
    console.log("Balances:");
    console.log(`Current: ${result.data.currentBalance}`);
    console.log(`Available: ${result.data.availableBalance}`);
    console.log(`Budget: ${result.data.budgetBalance}`);
    console.log(`Straight: ${result.data.straightBalance}`);
    console.log(`Cash: ${result.data.cashBalance}`);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch balances");
  }
}
