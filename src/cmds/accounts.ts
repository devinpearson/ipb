import { credentials, initializePbApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {
  json?: boolean;
}

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching accounts...").start();
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
