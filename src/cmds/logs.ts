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
  stopSpinner,
  validateFilePathForWrite,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Fetches execution logs from a card and saves them to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing, filename is missing, or API call fails
 */
export async function logsCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  if (options.filename === undefined || options.filename === '') {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'filename is required');
  }
  printTitleBox();
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '📊 fetching execution items...');
  if (spinnerEnabled) {
    spinner.start();
  }
  let logsDataRaw: string | undefined;
  let normalizedFilename = '';
  let logsSize = 0;

  try {
    const api = await initializeApi(credentials, options);
    const result = await api.getExecutions(cardKey);
    const logs = result.data.result.executionItems ?? [];
    logsDataRaw = JSON.stringify(logs, null, 4);
    logsSize = Buffer.byteLength(logsDataRaw, 'utf8');
    normalizedFilename = await validateFilePathForWrite(options.filename, ['.json']);
  } finally {
    stopSpinner(spinner, spinnerEnabled);
  }

  if (!logsDataRaw || normalizedFilename === '') {
    return;
  }

  // Show progress with file size for write operation
  const writeSpinner = createSpinner(
    spinnerEnabled,
    `💾 saving to file: ${normalizedFilename} (${formatFileSize(logsSize)})...`
  );
  if (spinnerEnabled) {
    writeSpinner.start();
  }
  await fsPromises.writeFile(normalizedFilename, logsDataRaw, 'utf8');
  stopSpinner(writeSpinner, spinnerEnabled);

  const finalSize = await getFileSize(normalizedFilename);
  console.log(`🎉 logs saved to file (${formatFileSize(finalSize)})`);
}
