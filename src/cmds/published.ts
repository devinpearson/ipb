import { promises as fsPromises } from 'node:fs';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
  resolveSpinnerState,
  stopSpinner,
  validateFilePathForWrite,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Fetches published code from a card and saves it to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function publishedCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🚀 fetching code...');
  if (spinnerEnabled) {
    spinner.start();
  }
  let code: string;
  try {
    const api = await initializeApi(credentials, options);

    const result = await api.getPublishedCode(cardKey);
    code = result.data.result.code;
  } finally {
    stopSpinner(spinner, spinnerEnabled);
  }
  const normalizedFilename = await validateFilePathForWrite(options.filename, ['.js']);
  console.log(`💾 saving to file: ${normalizedFilename}`);
  await fsPromises.writeFile(normalizedFilename, code, 'utf8');
  console.log('🎉 code saved to file');
}
