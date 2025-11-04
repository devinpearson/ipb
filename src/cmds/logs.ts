import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function logsCommand(options: Options) {
  try {
    if (options.cardKey === undefined) {
      if (credentials.cardKey === '') {
        throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
      }
      options.cardKey = Number(credentials.cardKey);
    }
    if (options.filename === undefined || options.filename === '') {
      throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'filename is required');
    }
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(!disableSpinner, '📊 fetching execution items...').start();
    const api = await initializeApi(credentials, options);

    const result = await api.getExecutions(options.cardKey);
    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    await fsPromises.writeFile(
      options.filename,
      JSON.stringify(result.data.result.executionItems, null, 4),
      'utf8'
    );
    console.log('🎉 ' + 'logs saved to file');
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch execution logs');
  }
}
