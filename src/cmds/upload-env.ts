import { promises as fsPromises } from 'node:fs';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
  resolveSpinnerState,
  validateFilePath,
  withSpinnerOutcome,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
  filename: string;
}

/**
 * Uploads environment variables to a card from a JSON file.
 * @param options - CLI options including card key, filename, and API credentials
 * @throws {CliError} When file doesn't exist, card key is missing, or upload fails
 */
export async function uploadEnvCommand(options: Options) {
  // Validate and normalize filename
  const normalizedFilename = await validateFilePath(options.filename, ['.json']);

  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🚀 uploading env...');
  const api = await initializeApi(credentials, options);

  await withSpinnerOutcome(spinner, spinnerEnabled, async () => {
    const raw = { variables: {} };
    const variables = await fsPromises.readFile(normalizedFilename, 'utf8');
    raw.variables = JSON.parse(variables);
    return await api.uploadEnv(cardKey, raw);
  });
  console.log(`🎉 env uploaded`);
}
