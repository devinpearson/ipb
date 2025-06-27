import { credentials, printTitleBox } from "../index.js";
import { initializeApi } from "../utils.js";
import { handleCliError, printTable, createSpinner } from "../utils.js";
import type { CommonOptions } from "./types.js";

export async function merchantsCommand(options: CommonOptions) {
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(
      !disableSpinner,
      "🏪 fetching merchants...",
    ).start();
    const api = await initializeApi(credentials, options);

    const result = await api.getMerchants();
    const merchants = result.data.result;
    spinner.stop();
    if (!merchants) {
      console.log("No merchants found");
      return;
    }

    const simpleMerchants = merchants.map(({ Code, Name }) => ({ Code, Name }));
    printTable(simpleMerchants);
    console.log(`\n${merchants.length} merchant(s) found.`);
  } catch (error: any) {
    handleCliError(error, options, "fetch merchants");
  }
}
