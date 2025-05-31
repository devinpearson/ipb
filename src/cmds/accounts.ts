import { credentials, initializePbApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";

interface Options extends CommonOptions {
  json?: boolean;
}

/**
 * Fetch and display Investec accounts.
 * @param options CLI options
 */
export async function accountsCommand(options: Options) {
  try {
    const api = await initializePbApi(credentials, options);
    if (options.verbose) console.log("💳 fetching accounts...");
    const result = await api.getAccounts();
    const accounts = result.data.accounts;
    if (!accounts || accounts.length === 0) {
      console.log("No accounts found");
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(accounts, null, 2));
    } else {
      const simpleAccounts = accounts.map(
        ({
          accountId,
          accountNumber,
          referenceName,
          productName,
        }: {
          accountId: string;
          accountNumber: string;
          referenceName: string;
          productName: string;
        }) => ({
          accountId,
          accountNumber,
          referenceName,
          productName,
        }),
      );
      printTable(simpleAccounts);
      console.log(`\n${accounts.length} account(s) found.`);
    }
  } catch (error: any) {
    handleCliError(error, options, "fetch accounts");
  }
}
