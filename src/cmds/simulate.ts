import { promises as fsPromises } from 'node:fs';
import chalk from 'chalk';
import { createTransaction } from 'programmable-card-code-emulator';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  getSafeText,
  initializeApi,
  isStdoutPiped,
  normalizeCardKey,
  resolveSpinnerState,
  validateFilePath,
  withSpinner,
} from '../utils.js';
import type { CommonOptions } from './types.js';

export interface SimulateCommandOptions extends CommonOptions {
  filename: string;
  cardKey?: string | number;
  currency: string;
  amount: number;
  mcc: string;
  merchant: string;
  city: string;
  country: string;
}

/**
 * Runs code using the online simulator.
 * @param options - CLI options including card key, filename, transaction details, and API credentials
 * @throws {CliError} When card key is missing, file doesn't exist, or simulation fails
 */
export async function simulateCommand(options: SimulateCommandOptions) {
  const isPiped = isStdoutPiped();
  if (!isPiped) {
    printTitleBox();
  }

  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  const normalizedFilename = await validateFilePath(options.filename, ['.js']);

  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const code = await fsPromises.readFile(normalizedFilename, 'utf8');
  const transaction = createTransaction(
    options.currency,
    options.amount,
    options.mcc,
    options.merchant,
    options.city,
    options.country
  );

  const spinner = createSpinner(spinnerEnabled, getSafeText('🚀 running cloud simulation...'));

  const result = await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);
    return await api.executeCode(code, transaction, cardKey);
  });

  const executionItems = result.data.result;
  console.log('');
  console.log(chalk.white(`Simulated code:`), chalk.blueBright(normalizedFilename));

  console.log(chalk.blue(`currency:`), chalk.green(transaction.currencyCode));
  console.log(chalk.blue(`amount:`), chalk.green(transaction.centsAmount));
  console.log(chalk.blue(`merchant code:`), chalk.green(transaction.merchant.category.code));
  console.log(chalk.blue(`merchant name:`), chalk.greenBright(transaction.merchant.name));
  console.log(chalk.blue(`merchant city:`), chalk.green(transaction.merchant.city));
  console.log(chalk.blue(`merchant country:`), chalk.green(transaction.merchant.country.code));

  executionItems.forEach((item) => {
    console.log('\n💻 ', chalk.green(item.type));
    item.logs.forEach((log) => {
      console.log('\n', chalk.yellow(log.level), chalk.white(log.content));
    });
  });
}
