import chalk from "chalk";
import { credentials, initializePbApi, printTable } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}

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
    //console.table(accounts)
    // console.log("Account Id \t\t\tAccount Number \tReference\t\t\tProduct");
    // for (let i = 0; i < accounts.length; i++) {
    //   if (accounts[i]) {
    //     console.log(
    //       chalk.greenBright(`${accounts[i]?.accountId ?? "N/A"}\t`) +
    //         chalk.blueBright(`${accounts[i]?.accountNumber ?? "N/A"}\t`) +
    //         chalk.redBright(`${accounts[i]?.referenceName ?? "N/A"}\t\t\t`) +
    //         chalk.yellowBright(`${accounts[i]?.productName ?? "N/A"}`),
    //     );
    //   }
    // }
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to fetch accounts:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
