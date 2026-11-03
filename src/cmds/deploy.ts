import { promises as fsPromises } from 'node:fs';
import dotenv from 'dotenv';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  assertWritable,
  confirmDestructiveOperation,
  createSpinner,
  formatFileSize,
  getFileSize,
  getSafeText,
  initializeApi,
  isStdoutPiped,
  normalizeCardKey,
  resolveSpinnerState,
  validateFilePath,
  withRetry,
  withSpinner,
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
  await assertWritable('ipb deploy', options);
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
  let codeId: string | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    // Read everything before touching the card, so a bad file fails with nothing changed.
    const envVariables = options.env ? await readEnvFile(`.env.${options.env}`) : undefined;
    const codeFileSize = await getFileSize(normalizedFilename);
    spinner.update(
      `🚀 reading code from ${normalizedFilename} (${formatFileSize(codeFileSize)})...`
    );
    const code = await fsPromises.readFile(normalizedFilename, 'utf8');

    const api = await initializeApi(credentials, options);

    // Saving code doesn't change what runs on the card until it is published.
    spinner.update(`🚀 saving code (${formatFileSize(Buffer.byteLength(code, 'utf8'))})...`);
    const uploadResult = await withRetry(() => api.uploadCode(cardKey, { code }), { verbose });
    codeId = uploadResult.data.result.codeId;
    const savedCodeId = codeId;

    let previousEnv: Record<string, unknown> | undefined;
    if (envVariables) {
      previousEnv =
        (await withRetry(() => api.getEnv(cardKey), { verbose })).data.result.variables ?? {};
      spinner.update(`📦 uploading env from .env.${options.env}...`);
      await withRetry(() => api.uploadEnv(cardKey, { variables: envVariables }), { verbose });
    }

    spinner.update('🚀 publishing code...');
    try {
      await withRetry(() => api.uploadPublishedCode(cardKey, savedCodeId, code), { verbose });
    } catch (error) {
      if (!previousEnv) {
        throw error;
      }
      throw await restoreEnvAfterFailedPublish(api, cardKey, previousEnv, error);
    }
  });

  if (!codeId) {
    return;
  }

  console.log(getSafeText(`🎉 code deployed with codeId: ${codeId}`));
}

async function readEnvFile(envFilePath: string): Promise<Record<string, string>> {
  try {
    const normalizedEnvPath = await validateFilePath(envFilePath);
    return dotenv.parse(await fsPromises.readFile(normalizedEnvPath, 'utf8'));
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

/**
 * Publishing failed after the env was replaced: put the previous env back so the
 * still-running published code keeps the variables it expects.
 */
async function restoreEnvAfterFailedPublish(
  api: Awaited<ReturnType<typeof initializeApi>>,
  cardKey: number,
  previousEnv: Record<string, unknown>,
  publishError: unknown
): Promise<CliError> {
  const reason = publishError instanceof Error ? publishError.message : String(publishError);
  try {
    await api.uploadEnv(cardKey, { variables: previousEnv });
    return new CliError(
      ERROR_CODES.DEPLOY_FAILED,
      `Publishing failed, so the card's previous environment variables were restored and the previously published code is still running. Cause: ${reason}`
    );
  } catch (restoreError) {
    const restoreReason =
      restoreError instanceof Error ? restoreError.message : String(restoreError);
    return new CliError(
      ERROR_CODES.DEPLOY_FAILED,
      `Publishing failed and the previous environment variables could not be restored, so the card now has the new env with the previously published code. Re-run deploy, or restore the env with \`ipb upload-env\`. Cause: ${reason}. Restore error: ${restoreReason}`
    );
  }
}
