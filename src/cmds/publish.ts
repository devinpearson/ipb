import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  initializeApi,
  normalizeCardKey,
  runReadUploadCommand,
  resolveSpinnerState,
  validateFilePath,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
  codeId: string;
}

/**
 * Publishes code to a card using a saved code ID.
 * @param options - CLI options including card key, filename, code ID, and API credentials
 * @throws {CliError} When file doesn't exist, card key is missing, or publishing fails
 */
export async function publishCommand(options: Options) {
  // Validate required codeId option
  if (!options.codeId || options.codeId.trim() === '') {
    throw new CliError(
      ERROR_CODES.MISSING_CODE_ID,
      'Code ID is required. Use -i or --code-id to specify the code ID from a previous upload command.'
    );
  }

  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.js']);

  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);

  // Require confirmation before publishing (activates code)
  printTitleBox();
  const confirmed = await confirmDestructiveOperation(
    `This will publish code (codeId: ${options.codeId}) to card ${cardKey} and make it active. Continue?`,
    { yes: options.yes }
  );

  if (!confirmed) {
    console.log('Publish cancelled.');
    return;
  }

  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🚀 reading code...');
  const api = await initializeApi(credentials, options);
  let result:
    | {
        data: {
          result: {
            codeId: string;
          };
        };
      }
    | undefined;
  result = await runReadUploadCommand({
    spinner,
    spinnerEnabled,
    filename: normalizedFilename,
    readMessage: (size) => `🚀 reading code from ${normalizedFilename} (${size})...`,
    uploadMessage: (size) => `🚀 publishing code (${size})...`,
    upload: async (content) =>
      await api.uploadPublishedCode(cardKey, options.codeId, content),
  });

  if (!result) {
    return;
  }
  console.log(`🎉 code published with codeId: ${result.data.result.codeId}`);
}
