import chalk from "chalk";
import fs from "fs";
import { fetchExecutions, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}
export async function logsCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("cardkey is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  if (options.filename === undefined || options.filename === "") {
    throw new Error("filename is required");
  }
  printTitleBox();
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
  console.log("📊 fetching execution items");
  console.log(" ");
  const result = await fetchExecutions(
    options.cardKey,
    credentials.host,
    token,
  );
  console.log(`💾 saving to file: ${options.filename}`);
  fs.writeFileSync(
    options.filename,
    JSON.stringify(result.data.result.executionItems, null, 4),
  );
  console.log("🎉 " + chalk.greenBright("logs saved to file"));
  console.log("");
}
