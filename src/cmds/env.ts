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
 * Downloads environment variables from a card and saves them to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function envCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '💎 fetching envs...').start();
  const api = await initializeApi(credentials, options);
  const result = await api.getEnv(cardKey);
  const envs = result.data.result.variables;
  spinner.stop();
  const normalizedFilename = await validateFilePathForWrite(options.filename, ['.json']);
  console.log(`💾 saving to file: ${normalizedFilename}`);
  await fsPromises.writeFile(normalizedFilename, JSON.stringify(envs, null, 4), 'utf8');
  console.log('🎉 envs saved to file');
}
