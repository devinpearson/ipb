import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  formatFileSize,
  getFileSize,
  initializeApi,
  normalizeCardKey,
  resolveSpinnerState,
  validateFilePathForWrite,
  withSpinner,
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
  printTitleBox();
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching code...');
  let code: string | undefined;
  let codeSize = 0;
  let normalizedFilename = '';
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);

    // The api object may not have a getCode method; use getSavedCode if available, or handle gracefully
    // biome-ignore lint/suspicious/noExplicitAny: API interface may not include all methods
    if (typeof (api as any).getSavedCode !== 'function') {
      throw new CliError(
        ERROR_CODES.DEPLOY_FAILED,
        'API client does not support fetching saved code (getSavedCode missing)'
      );
    }
    // biome-ignore lint/suspicious/noExplicitAny: API interface may not include all methods
    const result = await (api as any).getSavedCode(cardKey);

    if (
      !result ||
      !result.data ||
      !result.data.result ||
      typeof result.data.result.code !== 'string'
    ) {
      throw new CliError(ERROR_CODES.DEPLOY_FAILED, 'Failed to fetch code: Unexpected API response');
    }

    const fetchedCode = result.data.result.code;
    if (typeof fetchedCode !== 'string') {
      throw new CliError(ERROR_CODES.DEPLOY_FAILED, 'Failed to fetch code: Unexpected API response');
    }

    code = fetchedCode;
    codeSize = Buffer.byteLength(fetchedCode, 'utf8');
    normalizedFilename = await validateFilePathForWrite(options.filename, ['.js']);
  });

  if (typeof code !== 'string' || normalizedFilename === '') {
    return;
  }
  const codeToWrite = code;
  const targetFilename = normalizedFilename;

  // Show progress with file size for write operation
  const writeSpinner = createSpinner(
    spinnerEnabled,
    `💾 saving to file: ${targetFilename} (${formatFileSize(codeSize)})...`
  );
  await withSpinner(writeSpinner, spinnerEnabled, async () => {
    await fsPromises.writeFile(targetFilename, codeToWrite, 'utf8');
  });

  const finalSize = await getFileSize(targetFilename);
  console.log(`🎉 code saved to file (${formatFileSize(finalSize)})`);
}
