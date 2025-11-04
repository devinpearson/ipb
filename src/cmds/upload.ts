import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  handleCliError,
  initializeApi,
  normalizeCardKey,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Uploads code to a card without publishing it.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When file doesn't exist, card key is missing, or upload fails
 */
export async function uploadCommand(options: Options) {
  try {
    try {
      await fsPromises.access(options.filename);
    } catch {
      throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist');
    }
    const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '🚀 uploading code...');
    const api = await initializeApi(credentials, options);
    const raw = { code: '' };
    const code = await fsPromises.readFile(options.filename, 'utf8');
    raw.code = code;
    const result = await api.uploadCode(cardKey, raw);
    spinner.stop();
    console.log(`🎉 code uploaded with codeId: ${result.data.result.codeId}`);
  } catch (error: unknown) {
    handleCliError(error, options, 'upload code');
  }
}
