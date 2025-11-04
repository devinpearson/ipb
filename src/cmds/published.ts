import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function publishedCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === '') {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '🚀 fetching code...').start();
    const api = await initializeApi(credentials, options);

    const result = await api.getPublishedCode(options.cardKey);
    const code = result.data.result.code;
    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    await fsPromises.writeFile(options.filename, code, 'utf8');
    console.log('🎉 code saved to file');
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch published code');
  }
}
