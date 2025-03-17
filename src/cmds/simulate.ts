import chalk from "chalk";
import fs from "fs";
import {
  createTransaction,
  type ExecutionItem,
} from "programmable-card-code-emulator";
import { credentials, printTitleBox } from "../index.js";
import { executeCode, getAccessToken } from "../api.js";
interface Options {
  cardKey: number;
  filename: string;
  currency: string;
  amount: number;
  mcc: string;
  merchant: string;
  city: string;
  country: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
export async function simulateCommand(options: Options) {
  printTitleBox();
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
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
  console.log("🚀 uploading code & running simulation");
  const code = fs.readFileSync(options.filename).toString();
  const transaction = createTransaction(
    options.currency,
    options.amount,
    options.mcc,
    options.merchant,
    options.city,
    options.country,
  );

  const result = await executeCode(
    code,
    transaction,
    options.cardKey,
    credentials.host,
    token,
  );
  const executionItems = result.data.result as unknown as ExecutionItem[];
  console.log("");
  if (!fs.existsSync(options.filename)) {
    throw new Error("File does not exist");
  }
  console.log(
    chalk.white(`Simulated code:`),
    chalk.blueBright(options.filename),
  );

  console.log(chalk.blue(`currency:`), chalk.green(transaction.currencyCode));
  console.log(chalk.blue(`amount:`), chalk.green(transaction.centsAmount));
  console.log(
    chalk.blue(`merchant code:`),
    chalk.green(transaction.merchant.category.code),
  );
  console.log(
    chalk.blue(`merchant name:`),
    chalk.greenBright(transaction.merchant.name),
  );
  console.log(
    chalk.blue(`merchant city:`),
    chalk.green(transaction.merchant.city),
  );
  console.log(
    chalk.blue(`merchant country:`),
    chalk.green(transaction.merchant.country.code),
  );
  // Read the template env.json file and replace the values with the process.env values

  executionItems.forEach((item) => {
    console.log("\n💻 ", chalk.green(item.type));
    item.logs.forEach((log) => {
      console.log("\n", chalk.yellow(log.level), chalk.white(log.content));
    });
  });
  console.log("");
}
