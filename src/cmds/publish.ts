import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
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
    try {
      await fsPromises.access(options.filename);
    } catch {
      throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist');
    }
    if (options.cardKey === undefined) {
      if (credentials.cardKey === '') {
        throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
      }
      options.cardKey = Number(credentials.cardKey);
    }
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(!disableSpinner, '🚀 publishing code...').start();
    const api = await initializeApi(credentials, options);

    const code = await fsPromises.readFile(options.filename, 'utf8');
    const result = await api.uploadPublishedCode(options.cardKey, options.codeId, code);
    spinner.stop();
    console.log(`🎉 code published with codeId: ${result.data.result.codeId}`);
  } catch (error: unknown) {
    handleCliError(error, options, 'publish code');
  }
}
