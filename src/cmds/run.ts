import { promises as fsPromises } from 'node:fs';
import chalk from 'chalk';
import { createTransaction, run } from 'programmable-card-code-emulator';
import { CliError, ERROR_CODES } from '../errors.js';
import { printTitleBox } from '../index.js';
import { createSpinner, formatFileSize, getFileSize, stopSpinner, validateFilePath } from '../utils.js';

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

  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.js']);

  console.log(chalk.white(`Running code:`), chalk.blueBright(normalizedFilename));
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
    const envFilePath = `.env.${options.env}`;
    try {
      await validateFilePath(envFilePath);
    } catch (error) {
      if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
        throw new CliError(
          ERROR_CODES.MISSING_ENV_FILE,
          `Env file "${envFilePath}" does not exist.`
        );
      }
      throw error;
    }

    const envFileSize = await getFileSize(envFilePath);
    const spinner = createSpinner(
      true,
      `📖 reading env from ${envFilePath} (${formatFileSize(envFileSize)})...`
    ).start();
    try {
      const data = await fsPromises.readFile(envFilePath, 'utf8');
      const lines = data.split('\n');
      environmentvariables = convertToJson(lines);
    } finally {
      stopSpinner(spinner, true);
    }
  }
  // Convert the environmentvariables to a string
  const environmentvariablesString = JSON.stringify(environmentvariables);

  const codeFileSize = await getFileSize(normalizedFilename);
  const codeSpinner = createSpinner(
    true,
    `📖 reading code from ${normalizedFilename} (${formatFileSize(codeFileSize)})...`
  ).start();
  let code: string;
  try {
    code = await fsPromises.readFile(normalizedFilename, 'utf8');
  } finally {
    stopSpinner(codeSpinner, true);
  }
  // Run the code
  const executionItems = await run(transaction, code, environmentvariablesString);
  executionItems.forEach((item) => {
    console.log('\n💻 ', chalk.green(item.type));
    item.logs.forEach((log) => {
      console.log('\n', chalk.yellow(log.level), chalk.white(log.content));
    });
  });
}

function convertToJson(arr: string[]) {
  const output: { [key: string]: string } = {};
  for (let i = 0; i < arr.length; i++) {
    const line = arr[i];

    if (line !== '\r') {
      const _txt = line?.trim();

      if (line) {
        const equalsIndex = line.indexOf('=');
        if (equalsIndex !== -1) {
          const key = line.substring(0, equalsIndex).trim();
          let fullValue = line.substring(equalsIndex + 1).trim();
          // Strip optional wrapping quotes (single or double) if present
          if (fullValue.length >= 2) {
            const firstChar = fullValue[0];
            const lastChar = fullValue[fullValue.length - 1];
            if (
              (firstChar === '"' && lastChar === '"') ||
              (firstChar === "'" && lastChar === "'")
            ) {
              fullValue = fullValue.slice(1, -1);
            }
          }
          if (key) {
            output[key] = fullValue;
          }
        }
      }
    }
  }
  return output;
}
