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
 * Fetches saved code from a card and saves it to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing, API doesn't support fetching, or file operations fail
 */
export async function fetchCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true; // default false
    const spinner = createSpinner(!disableSpinner, '💳 fetching code...').start();
    const api = await initializeApi(credentials, options);

    // The api object may not have a getCode method; use getSavedCode if available, or handle gracefully
    if (typeof (api as any).getSavedCode !== 'function') {
      spinner.stop();
      throw new CliError(
        ERROR_CODES.DEPLOY_FAILED,
        'API client does not support fetching saved code (getSavedCode missing)'
      );
    }
    const result = await (api as any).getSavedCode(cardKey);

    if (!result || !result.data || !result.data.result || typeof result.data.result.code !== 'string') {
      spinner.stop();
      throw new CliError(ERROR_CODES.DEPLOY_FAILED, 'Failed to fetch code: Unexpected API response');
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
