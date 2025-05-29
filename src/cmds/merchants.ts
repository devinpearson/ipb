import { credentials, initializeApi, printTable } from "../index.js";
import { handleCliError } from "./utils.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}
export async function merchantsCommand(options: Options) {
  try {
    const api = await initializeApi(credentials, options);

    console.log("🏪 fetching merchants");
    const result = await api.getMerchants();
    const merchants = result.data.result;
    console.log("");
    if (!merchants) {
      console.log("No merchants found");
      return;
    }

    const simpleMerchants = merchants.map(({ Code, Name }) => ({ Code, Name }));
    printTable(simpleMerchants);

    console.log("");
  } catch (error: any) {
    handleCliError(error, options, "fetch merchants");
  }
}
