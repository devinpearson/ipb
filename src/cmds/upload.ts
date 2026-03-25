import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
  resolveSpinnerState,
  runReadUploadCommand,
  validateFilePath,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Uploads code to a card without publishing it.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When file doesn't exist, card key is missing, or upload fails
 */
export async function uploadCommand(options: Options) {
  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.js']);

  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🚀 reading code...');
  const api = await initializeApi(credentials, options);
  const result = await runReadUploadCommand({
    spinner,
    spinnerEnabled,
    filename: normalizedFilename,
    readMessage: (size) => `🚀 reading code from ${normalizedFilename} (${size})...`,
    uploadMessage: (size) => `🚀 uploading code (${size})...`,
    upload: async (content) => await api.uploadCode(cardKey, { code: content }),
  });

  console.log(`🎉 code uploaded with codeId: ${result.data.result.codeId}`);
}
