import fs, { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { createTransaction, run } from 'programmable-card-code-emulator';
import { CliError, ERROR_CODES } from '../errors.js';
import { printTitleBox } from '../index.js';
import { handleCliError } from '../utils.js';

interface Options {
  filename: string;
  env: string;
  currency: string;
  amount: number;
  mcc: string;
  merchant: string;
  city: string;
  country: string;
  verbose: boolean;
}

/**
 * Runs code locally using the programmable card code emulator.
 * @param options - CLI options including filename, transaction details, and optional env file
 * @throws {CliError} When file doesn't exist or code execution fails
 */
export async function runCommand(options: Options) {
  printTitleBox();
  try {
    try {
      await fsPromises.access(options.filename);
    } catch {
      throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist');
    }
    console.log(chalk.white(`Running code:`), chalk.blueBright(options.filename));
    const transaction = createTransaction(
      options.currency,
      options.amount,
      options.mcc,
      options.merchant,
      options.city,
      options.country
    );
    console.log(chalk.blue(`currency:`), chalk.green(transaction.currencyCode));
    console.log(chalk.blue(`amount:`), chalk.green(transaction.centsAmount));
    console.log(chalk.blue(`merchant code:`), chalk.green(transaction.merchant.category.code));
    console.log(chalk.blue(`merchant name:`), chalk.greenBright(transaction.merchant.name));
    console.log(chalk.blue(`merchant city:`), chalk.green(transaction.merchant.city));
    console.log(chalk.blue(`merchant country:`), chalk.green(transaction.merchant.country.code));
    // Read the template env.json file and replace the values with the process.env values

    let environmentvariables: { [key: string]: string } = {};
    if (options.env) {
      try {
        await fsPromises.access(`.env.${options.env}`);
      } catch {
        throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'Env does not exist');
      }

      const data = await fsPromises.readFile(`.env.${options.env}`, 'utf8');
      const lines = data.split('\n');

      environmentvariables = convertToJson(lines);
    }
    // Convert the environmentvariables to a string
    const environmentvariablesString = JSON.stringify(environmentvariables);
    const code = await fsPromises.readFile(path.join(path.resolve(), options.filename), 'utf8');
    // Run the code
    const executionItems = await run(transaction, code, environmentvariablesString);
    executionItems.forEach((item) => {
      console.log('\n💻 ', chalk.green(item.type));
      item.logs.forEach((log) => {
        console.log('\n', chalk.yellow(log.level), chalk.white(log.content));
      });
    });
  } catch (error: unknown) {
    handleCliError(error, { verbose: options.verbose }, 'run code');
  }
}

function convertToJson(arr: string[]) {
  const output: { [key: string]: string } = {};
  for (let i = 0; i < arr.length; i++) {
    const line = arr[i];

    if (line !== '\r') {
      const _txt = line?.trim();

      if (line) {
        const key = line.split('=')[0]?.trim();
        const value = line.split('=')[1]?.trim();
        if (key && value) {
          output[key] = value;
        }
      }
    }
  }
  return output;
}
