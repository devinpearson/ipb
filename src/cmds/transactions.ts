import { credentials, initializePbApi } from "@src/index.js";
import { handleCliError, printTable } from "@utils";
import type { CommonOptions } from "@types";
interface Options extends CommonOptions {}

export async function transactionsCommand(accountId: string, options: Options) {
  try {
    const api = await initializePbApi(credentials, options);

    console.log("💳 fetching transactions");
    const result = await api.getAccountTransactions(
      accountId,
      null,
      null,
      null,
    );
    const transactions = result.data.transactions;
    console.log("");
    if (!transactions) {
      console.log("No transactions found");
      return;
    }

    const simpleTransactions = transactions.map(
      ({ uuid, amount, transactionDate, description }) => ({
        uuid,
        amount,
        transactionDate,
        description,
      }),
    );
    printTable(simpleTransactions);
  } catch (error: any) {
    if (error.message && error.message === "Bad Request") {
      console.log("");
      console.error(`Account with ID ${accountId} not found.`);
    } else {
      handleCliError(error, options, "fetch transactions");
    }
  }
}
