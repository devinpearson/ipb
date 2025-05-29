import chalk from "chalk";
import fs from "fs";
import path from "path";
import { createTransaction, run } from "programmable-card-code-emulator";
import { printTitleBox } from "../index.js";
import { handleCliError } from "../utils.js";
interface Options {
  filename: string;
  env: string;
  currency: string;
  amount: number;
  mcc: string;
  merchant: string;
  city: string;
  country: string;
  // verbose: boolean;
}
export async function runCommand(options: any) {
  printTitleBox();
  try {
    if (!fs.existsSync(options.filename)) {
      throw new Error("File does not exist");
    }
    console.log(
      chalk.white(`Running code:`),
      chalk.blueBright(options.filename),
    );
    const transaction = createTransaction(
      options.currency,
      options.amount,
      options.mcc,
      options.merchant,
      options.city,
      options.country,
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

    let environmentvariables: { [key: string]: string } = {};
    if (options.env) {
      if (!fs.existsSync(`.env.${options.env}`)) {
        throw new Error("Env does not exist");
      }

      const data = fs.readFileSync(`.env.${options.env}`, "utf8");
      let lines = data.split("\n");

      environmentvariables = convertToJson(lines);
    }
    // Convert the environmentvariables to a string
    let environmentvariablesString = JSON.stringify(environmentvariables);
    const code = fs.readFileSync(
      path.join(path.resolve(), options.filename),
      "utf8",
    );
    // Run the code
    const executionItems = await run(
      transaction,
      code,
      environmentvariablesString,
    );
    executionItems.forEach((item) => {
      console.log("\n💻 ", chalk.green(item.type));
      item.logs.forEach((log) => {
        console.log("\n", chalk.yellow(log.level), chalk.white(log.content));
      });
    });
    console.log("");
  } catch (error: any) {
    handleCliError(error, { verbose: options.verbose }, "run code");
  }
}

function convertToJson(arr: string[]) {
  let output: { [key: string]: string } = {};
  for (let i = 0; i < arr.length; i++) {
    let line = arr[i];

    if (line !== "\r") {
      let txt = line?.trim();

      if (line) {
        let key = line.split("=")[0]?.trim();
        let value = line.split("=")[1]?.trim();
        if (key && value) {
          output[key] = value;
        }
      }
    }
  }
  return output;
}
