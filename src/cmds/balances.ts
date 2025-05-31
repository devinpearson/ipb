import { credentials, initializePbApi } from "@src/index.js";
import { handleCliError } from "@utils";
import type { CommonOptions } from "@types";
interface Options extends CommonOptions {
  accountId: string;
}

/**
 * Fetch and display Investec balances for a given account.
 * @param accountId The account ID to fetch balances for
 * @param options CLI options
 */
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
  } catch (error: any) {
    if (error.message && error.message === "Bad Request") {
      console.log("");
      console.error(`Account with ID ${accountId} not found.`);
    } else {
      handleCliError(error, options, "fetch balances");
    }
  }
}
