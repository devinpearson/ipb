import { promises as fsPromises } from 'node:fs';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function fetchCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === '') {
      throw new Error('card-key is required');
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '💳 fetching code...').start();
    const api = await initializeApi(credentials, options);

    // The api object may not have a getCode method; use getSavedCode if available, or handle gracefully
    if (typeof (api as any).getSavedCode !== 'function') {
      spinner.stop();
      throw new Error('API client does not support fetching saved code (getSavedCode missing)');
    }
    const result = await (api as any).getSavedCode(options.cardKey);

    if (!result || !result.data || !result.data.result || typeof result.data.result.code !== 'string') {
      spinner.stop();
      throw new Error('Failed to fetch code: Unexpected API response');
    }

    const code = result.data.result.code;

    spinner.stop();
    console.log(`💾 saving to file: ${options.filename}`);
    await fsPromises.writeFile(options.filename, code, 'utf8');
    console.log('🎉 code saved to file');
  } catch (error: unknown) {
    handleCliError(error, options, 'fetch saved code');
  }
}
