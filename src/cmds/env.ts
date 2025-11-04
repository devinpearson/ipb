import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function envCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === '') {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '💎 fetching envs...').start();
    const api = await initializeApi(credentials, options);
    const result = await api.getEnv(options.cardKey);
    const envs = result.data.result.variables;
    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    await fsPromises.writeFile(options.filename, JSON.stringify(envs, null, 4), 'utf8');
    console.log('🎉 envs saved to file');
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch environment variables');
  }
}
