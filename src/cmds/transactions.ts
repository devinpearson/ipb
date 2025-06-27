import { credentials, initializePbApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}

/**
 * Minimal transaction type for CLI display.
 */
type Transaction = {
  uuid: string;
  amount: number;
  transactionDate: string;
  description: string;
  // ...other fields can be added as needed
};

/**
 * Fetch and display transactions for a given account.
 * @param accountId - The account ID to fetch transactions for.
 * @param options - CLI options.
 */
export async function transactionsCommand(accountId: string, options: Options) {
  try {
    printTitleBox();
    const spinner = ora("💳 fetching transactions...").start();
    const api = await initializePbApi(credentials, options);

    const result = await api.getAccountTransactions(
      accountId,
      null,
      null,
      null,
    );
    const transactions = result.data.transactions;
    spinner.stop();
    if (!transactions) {
      console.log("No transactions found");
      return;
    }

    const simpleTransactions = transactions.map(
      ({ uuid, amount, transactionDate, description }: Transaction) => ({
        uuid,
        amount,
        transactionDate,
        description,
      }),
    );
    printTable(simpleTransactions);
    console.log(`\n${transactions.length} transaction(s) found for account ${accountId}.`);
  } catch (error: any) {
    if (error.message && error.message === "Bad Request") {
      console.log("");
      console.error(`Account with ID ${accountId} not found.`);
    } else {
      handleCliError(error, options, "fetch transactions");
    }
  }
}
