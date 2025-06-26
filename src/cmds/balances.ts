import { credentials, initializePbApi, printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}

export async function balancesCommand(accountId: string, options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching balances...").start();
    const api = await initializePbApi(credentials, options);

    const result = await api.getAccountBalances(accountId);
    spinner.stop();
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
