import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
  runWriteCommand,
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
 * Downloads environment variables from a card and saves them to a file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function envCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💎 fetching envs...');
  let envs: Record<string, unknown> | undefined;
  let normalizedFilename = '';
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);
    const result = await api.getEnv(cardKey);
    envs = result.data.result.variables ?? {};
    normalizedFilename = await validateFilePathForWrite(options.filename, ['.json']);
  });

  if (envs === undefined || normalizedFilename === '') {
    return;
  }
  const content = JSON.stringify(envs, null, 4);
  await runWriteCommand({
    spinnerEnabled,
    filename: normalizedFilename,
    content,
    progressMessage: (size) => `💾 saving to file: ${normalizedFilename} (${size})...`,
    successMessage: (size) => `🎉 envs saved to file (${size})`,
  });
}
