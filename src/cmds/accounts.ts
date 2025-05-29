import { credentials, initializePbApi, printTable } from "../index.js";
import { handleCliError } from "./utils.js";
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

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch accounts");
  }
}
