import fs from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, handleCliError, initializeApi } from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey: number;
  filename: string;
}

export async function uploadEnvCommand(options: Options) {
  if (!fs.existsSync(options.filename)) {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist');
  }
  if (options.cardKey === undefined) {
    if (credentials.cardKey === '') {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
    }
    options.cardKey = Number(credentials.cardKey);
  }
  try {
    printTitleBox();
    const disableSpinner = options.spinner === true;
    const spinner = createSpinner(!disableSpinner, '🚀 uploading env...');
    const api = await initializeApi(credentials, options);

    const raw = { variables: {} };
    const variables = fs.readFileSync(options.filename, 'utf8');
    raw.variables = JSON.parse(variables);
    const _result = await api.uploadEnv(options.cardKey, raw);
    spinner.stop();
    console.log(`🎉 env uploaded`);
  } catch (error: unknown) {
    handleCliError(error, options, 'upload environment variables');
  }
}
