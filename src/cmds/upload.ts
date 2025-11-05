import { promises as fsPromises } from 'node:fs';
import { credentials, printTitleBox } from '../index.js';
import {
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
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '🚀 reading code...');
  const api = await initializeApi(credentials, options);

  const codeFileSize = await getFileSize(normalizedFilename);
  spinner.text = `🚀 reading code from ${normalizedFilename} (${formatFileSize(codeFileSize)})...`;
  spinner.start();

  const raw = { code: '' };
  const code = await fsPromises.readFile(normalizedFilename, 'utf8');
  raw.code = code;
  const codeSize = Buffer.byteLength(code, 'utf8');
  spinner.text = `🚀 uploading code (${formatFileSize(codeSize)})...`;
  const result = await api.uploadCode(cardKey, raw);
  spinner.stop();
  console.log(`🎉 code uploaded with codeId: ${result.data.result.codeId}`);
}
