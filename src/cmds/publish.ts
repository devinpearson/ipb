import { promises as fsPromises } from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  formatFileSize,
  getFileSize,
  initializeApi,
  normalizeCardKey,
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
      ERROR_CODES.MISSING_API_TOKEN,
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
  
  const disableSpinner = options.spinner === true;
  const spinner = createSpinner(!disableSpinner, '🚀 reading code...').start();
  const api = await initializeApi(credentials, options);

  const codeFileSize = await getFileSize(normalizedFilename);
  spinner.text = `🚀 reading code from ${normalizedFilename} (${formatFileSize(codeFileSize)})...`;
  const code = await fsPromises.readFile(normalizedFilename, 'utf8');
  const codeSize = Buffer.byteLength(code, 'utf8');
  spinner.text = `🚀 publishing code (${formatFileSize(codeSize)})...`;
  const result = await api.uploadPublishedCode(cardKey, options.codeId, code);
  spinner.stop();
  console.log(`🎉 code published with codeId: ${result.data.result.codeId}`);
}
