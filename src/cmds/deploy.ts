import { promises as fsPromises } from 'node:fs';
import dotenv from 'dotenv';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  formatFileSize,
  getFileSize,
  getSafeText,
  initializeApi,
  normalizeCardKey,
  resolveSpinnerState,
  stopSpinner,
  validateFilePath,
  withRetry,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
  env: string;
}

/**
 * Deploys code to a programmable card.
 * @param options - CLI options including card key, filename, optional env file, and API credentials
 * @throws {CliError} When card key is missing, files don't exist, or deployment fails
 */
export async function deployCommand(options: Options) {
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();

  if (!isPiped) {
    printTitleBox();
  }

  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.js']);

  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);

  // Require confirmation before deploying (overwrites existing code)
  const confirmed = await confirmDestructiveOperation(
    `This will deploy code to card ${cardKey} and overwrite any existing code. Continue?`,
    { yes: options.yes }
  );

  if (!confirmed) {
    console.log('Deployment cancelled.');
    return;
  }

  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 starting deployment...');
  if (spinnerEnabled) {
    spinner.start();
  }
  let envObject = {};
  let saveResult:
    | {
        data: {
          result: {
            codeId: string;
          };
        };
      }
    | undefined;
  const api = await initializeApi(credentials, options);

  try {
    if (options.env) {
      const envFilePath = `.env.${options.env}`;
      try {
        const normalizedEnvPath = await validateFilePath(envFilePath);
        const envFileSize = await getFileSize(normalizedEnvPath);
        spinner.text = getSafeText(
          `📦 reading env from ${envFilePath} (${formatFileSize(envFileSize)})...`
        );
        const envFileContent = await fsPromises.readFile(normalizedEnvPath, 'utf8');
        envObject = dotenv.parse(envFileContent);
        spinner.text = getSafeText(
          `📦 uploading env from ${envFilePath} (${formatFileSize(envFileSize)})...`
        );

        // Use retry logic with rate limit handling
        await withRetry(() => api.uploadEnv(cardKey, { variables: envObject }), {
          maxRetries: 3,
          verbose,
        });
        spinner.text = getSafeText('📦 env uploaded');
      } catch (error) {
        if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
          throw new CliError(
            ERROR_CODES.MISSING_ENV_FILE,
            `Env file "${envFilePath}" does not exist. Check the file path and ensure the file exists.`
          );
        }
        throw error;
      }
    }
    const codeFileSize = await getFileSize(normalizedFilename);
    spinner.text = getSafeText(
      `🚀 reading code from ${normalizedFilename} (${formatFileSize(codeFileSize)})...`
    );
    const raw = { code: '' };

    const code = await fsPromises.readFile(normalizedFilename, 'utf8');
    raw.code = code;
    const codeSize = Buffer.byteLength(code, 'utf8');
    spinner.text = getSafeText(`🚀 deploying code (${formatFileSize(codeSize)})...`);

    // Use retry logic with rate limit handling for API calls
    const uploadResult = await withRetry(() => api.uploadCode(cardKey, raw), {
      maxRetries: 3,
      verbose,
    });
    const codeId = uploadResult.data.result.codeId;
    saveResult = uploadResult;

    await withRetry(() => api.uploadPublishedCode(cardKey, codeId, code), {
      maxRetries: 3,
      verbose,
    });
  } finally {
    stopSpinner(spinner, spinnerEnabled);
  }

  if (!saveResult) {
    return;
  }

  console.log(getSafeText(`🎉 code deployed with codeId: ${saveResult.data.result.codeId}`));
}
