import chalk from "chalk";
import { fetchCurrencies, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
export async function currenciesCommand(options: Options) {
  printTitleBox();
  if (options.credentialsFile) {
    const file = await import("file://" + options.credentialsFile, {
      with: { type: "json" },
    });
    if (file.host) {
      credentials.host = file.host;
    }
    if (file.apiKey) {
      credentials.apiKey = file.apiKey;
    }
    if (file.clientId) {
      credentials.clientId = file.clientId;
    }
    if (file.clientSecret) {
      credentials.clientSecret = file.clientSecret;
    }
  }
  if (options.apiKey) {
    credentials.apiKey = options.apiKey;
  }
  if (options.clientId) {
    credentials.clientId = options.clientId;
  }
  if (options.clientSecret) {
    credentials.clientSecret = options.clientSecret;
  }
  if (options.host) {
    credentials.host = options.host;
  }
  const token = await getAccessToken(
    credentials.host,
    credentials.clientId,
    credentials.clientSecret,
    credentials.apiKey,
  );
  console.log("💳 fetching currencies");
  const result = await fetchCurrencies(credentials.host, token);
  console.log("");
  if (!result) {
    console.log("No currencies found");
    return;
  }
  console.log("Code \t Name");
  for (let i = 0; i < result.length; i++) {
    if (result[i]) {
      console.log(
        chalk.greenBright(`${result[i]?.Code ?? "N/A"}`) +
          ` \t ` +
          chalk.blueBright(`${result[i]?.Name ?? "N/A"}`),
      );
    }
  }
  console.log("");
  // console.table(result);
}
