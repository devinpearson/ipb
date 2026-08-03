import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  createSpinner,
  initializeApi,
  isStdoutPiped,
  normalizeCardKey,
  resolveSpinnerState,
  runWriteCommand,
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
 * @throws {CliError} When card key is missing, API response is unexpected, or file operations fail
 */
export async function fetchCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching code...');
  let code: string | undefined;
  let normalizedFilename = '';
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);
    const result = await api.getCode(cardKey);

    if (
      !result ||
      !result.data ||
      !result.data.result ||
      typeof result.data.result.code !== 'string'
    ) {
      throw new CliError(
        ERROR_CODES.INVESTEC_API_ERROR,
        'Failed to fetch code: Unexpected API response'
      );
    }

    code = result.data.result.code;
    normalizedFilename = await validateFilePathForWrite(options.filename, ['.js']);
  });

  if (typeof code !== 'string' || normalizedFilename === '') {
    return;
  }
  const codeToWrite = code;
  const targetFilename = normalizedFilename;

  await runWriteCommand({
    spinnerEnabled,
    filename: targetFilename,
    content: codeToWrite,
    progressMessage: (size) => `💾 saving to file: ${targetFilename} (${size})...`,
    successMessage: (size) => `🎉 code saved to file (${size})`,
  });
}
