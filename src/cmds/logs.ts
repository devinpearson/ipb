import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Fetches execution logs from a card and saves them to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing, filename is missing, or API call fails
 */
export async function logsCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  if (options.filename === undefined || options.filename === '') {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'filename is required');
  }
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '📊 fetching execution items...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getExecutions(cardKey);
  spinner.stop();
  console.log(`💾 saving to file: ${options.filename}`);
  await fsPromises.writeFile(
    options.filename,
    JSON.stringify(result.data.result.executionItems, null, 4),
    'utf8'
  );
  console.log('🎉 ' + 'logs saved to file');
}
