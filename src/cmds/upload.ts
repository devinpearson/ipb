import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function uploadCommand(options: Options) {
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
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '🚀 uploading code...');
    const api = await initializeApi(credentials, options);
    const raw = { code: '' };
    const code = await fsPromises.readFile(options.filename, 'utf8');
    raw.code = code;
    const result = await api.uploadCode(options.cardKey, raw);
    spinner.stop();
    console.log(`🎉 code uploaded with codeId: ${result.data.result.codeId}`);
  } catch (error: unknown) {
    handleCliError(error, options, 'upload code');
  }
}
