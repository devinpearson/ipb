import { credentials, initializeApi, printTitleBox } from "../index.js";
import { handleCliError, printTable } from "../utils.js";
import type { CommonOptions } from "./types.js";
import ora from "ora";

interface Options extends CommonOptions {}

export async function merchantsCommand(options: Options) {
  try {
    printTitleBox();
    const spinner = ora("🏪 fetching merchants...").start();
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
  } catch (error: any) {
    handleCliError(error, options, "fetch merchants");
  }
}
