import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
  validateFilePath,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Uploads environment variables to a card from a JSON file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When file doesn't exist, card key is missing, or upload fails
 */
export async function uploadEnvCommand(options: Options) {
  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.json']);
  
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '🚀 uploading env...');
  const api = await initializeApi(credentials, options);

  const raw = { variables: {} };
  const variables = await fsPromises.readFile(normalizedFilename, 'utf8');
  raw.variables = JSON.parse(variables);
  const _result = await api.uploadEnv(cardKey, raw);
  spinner.stop();
  console.log(`🎉 env uploaded`);
}
