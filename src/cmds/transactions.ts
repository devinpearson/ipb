import chalk from "chalk";
import { credentials, initializePbApi } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}

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
    // console.log(result.data)
    const transactions = result.data.transactions;
    console.log("");
    if (!transactions) {
      console.log("No transactions found");
      return;
    }

    console.log("UUID\t\t\tAmount\tDate\tDescription");
    for (let i = 0; i < transactions.length; i++) {
      if (transactions[i]) {
        console.log(
          chalk.greenBright(`${transactions[i]?.uuid ?? "N/A"}\t`) +
            chalk.redBright(`${transactions[i]?.amount ?? "N/A"}\t`) +
            chalk.yellowBright(
              `${transactions[i]?.transactionDate ?? "N/A"}\t`,
            ) +
            chalk.blueBright(`${transactions[i]?.description ?? "N/A"}`),
        );
      }
    }
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to fetch accounts:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
