import chalk from "chalk";
import { fetchCards, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
export async function cardsCommand(options: Options) {
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
  console.log("💳 fetching cards");
  const result = await fetchCards(credentials.host, token);
  console.log("");
  if (!result) {
    console.log("No cards found");
    return;
  }
  console.log("Card Key \t Card Number \t\t Code Enabled");
  for (let i = 0; i < result.length; i++) {
    if (result[i]) {
      console.log(
        chalk.greenBright(`${result[i]?.CardKey ?? "N/A"}`) +
          ` \t ` +
          chalk.blueBright(`${result[i]?.CardNumber ?? "N/A"}`) +
          chalk.redBright(` \t ${result[i]?.IsProgrammable ?? "N/A"}`),
      );
    }
  }
  console.log("");
  // console.table(result);
}
