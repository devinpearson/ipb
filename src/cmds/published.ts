import { promises as fsPromises } from 'node:fs';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
  validateFilePathForWrite,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Fetches published code from a card and saves it to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function publishedCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '🚀 fetching code...').start();
  const api = await initializeApi(credentials, options);

  const result = await api.getPublishedCode(cardKey);
  const code = result.data.result.code;
  spinner.stop();
  const normalizedFilename = await validateFilePathForWrite(options.filename, ['.js']);
  console.log(`💾 saving to file: ${normalizedFilename}`);
  await fsPromises.writeFile(normalizedFilename, code, 'utf8');
  console.log('🎉 code saved to file');
}
