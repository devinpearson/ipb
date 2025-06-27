import { credentials, printTitleBox } from "../index.js";
import { initializePbApi } from "../utils.js";
import { handleCliError, printTable, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(
      !disableSpinner,
      "💳 fetching accounts...",
    ).start();
    const api = await initializePbApi(credentials, options);
    if (options.verbose) console.log("💳 fetching accounts...");
    const result = await api.getAccounts();
    const accounts = result.data.accounts;
    if (!accounts || accounts.length === 0) {
      spinner.stop();
      console.log("No accounts found");
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(accounts, null, 2));
    } else {
      const simpleAccounts = accounts.map(
        ({ accountId, accountNumber, referenceName, productName }) => ({
          accountId,
          accountNumber,
          referenceName,
          productName,
        }),
      );
      spinner.stop();
      printTable(simpleAccounts);
      console.log(`\n${accounts.length} account(s) found.`);
    }
  } catch (error: any) {
    handleCliError(error, options, "fetch accounts");
  }
}
