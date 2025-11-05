import { promises as fsPromises } from 'node:fs';
import chalk from 'chalk';
import { createTransaction } from 'programmable-card-code-emulator';
import { credentials } from '../index.js';
import { initializeApi, normalizeCardKey, validateFilePath } from '../utils.js';

interface Options {
  cardKey?: string | number;
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
  verbose: boolean;
}

/**
 * Runs code using the online simulator.
 * @param options - CLI options including card key, filename, transaction details, and API credentials
 * @throws {CliError} When card key is missing, file doesn't exist, or simulation fails
 */
export async function simulateCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);

  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.js']);

  const api = await initializeApi(credentials, options);

  console.log('🚀 uploading code & running simulation');
  const code = await fsPromises.readFile(normalizedFilename, 'utf8');
  const transaction = createTransaction(
    options.currency,
    options.amount,
    options.mcc,
    options.merchant,
    options.city,
    options.country
  );

  const result = await api.executeCode(code, transaction, cardKey);
  const executionItems = result.data.result;
  console.log('');
  console.log(chalk.white(`Simulated code:`), chalk.blueBright(normalizedFilename));

  console.log(chalk.blue(`currency:`), chalk.green(transaction.currencyCode));
  console.log(chalk.blue(`amount:`), chalk.green(transaction.centsAmount));
  console.log(chalk.blue(`merchant code:`), chalk.green(transaction.merchant.category.code));
  console.log(chalk.blue(`merchant name:`), chalk.greenBright(transaction.merchant.name));
  console.log(chalk.blue(`merchant city:`), chalk.green(transaction.merchant.city));
  console.log(chalk.blue(`merchant country:`), chalk.green(transaction.merchant.country.code));
  // Read the template env.json file and replace the values with the process.env values

  executionItems.forEach((item) => {
    console.log('\n💻 ', chalk.green(item.type));
    item.logs.forEach((log) => {
      console.log('\n', chalk.yellow(log.level), chalk.white(log.content));
    });
  });
}
