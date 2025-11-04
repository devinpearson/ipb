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
  codeId: string;
}

/**
 * Publishes code to a card using a saved code ID.
 * @param options - CLI options including card key, filename, code ID, and API credentials
 * @throws {CliError} When file doesn't exist, card key is missing, or publishing fails
 */
export async function publishCommand(options: Options) {
  try {
    await fsPromises.access(options.filename);
  } catch {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist');
  }
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '🚀 publishing code...').start();
  const api = await initializeApi(credentials, options);

  const code = await fsPromises.readFile(options.filename, 'utf8');
  const result = await api.uploadPublishedCode(cardKey, options.codeId, code);
  spinner.stop();
  console.log(`🎉 code published with codeId: ${result.data.result.codeId}`);
}
