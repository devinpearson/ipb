import fs, { promises as fsPromises } from 'node:fs';
import dotenv from 'dotenv';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  initializeApi,
  normalizeCardKey,
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
  printTitleBox();
  
  // Validate required filename option
  if (!options.filename || options.filename.trim() === '') {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'Filename is required. Use -f or --filename to specify the JavaScript file to deploy.'
    );
  }
  
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '💳 starting deployment...').start();
  let envObject = {};
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);

  const api = await initializeApi(credentials, options);

  if (options.env) {
    try {
      await fsPromises.access(`.env.${options.env}`);
    } catch {
      throw new CliError(
        ERROR_CODES.MISSING_ENV_FILE,
        `Env file .env.${options.env} does not exist`
      );
    }
    spinner.text = `📦 uploading env from .env.${options.env}`;
    const envFileContent = await fsPromises.readFile(`.env.${options.env}`, 'utf8');
    envObject = dotenv.parse(envFileContent);

    await api.uploadEnv(cardKey, { variables: envObject });
    spinner.text = '📦 env uploaded';
  }
  spinner.text = '🚀 deploying code';
  const raw = { code: '' };
  
  // Validate file exists before reading
  try {
    await fsPromises.access(options.filename);
  } catch {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `File "${options.filename}" does not exist. Check the file path and ensure the file exists.`
    );
  }
  
  const code = await fsPromises.readFile(options.filename, 'utf8');
  raw.code = code;
  const saveResult = await api.uploadCode(cardKey, raw);
  await api.uploadPublishedCode(cardKey, saveResult.data.result.codeId, code);
  spinner.stop();
  console.log(`🎉 code deployed with codeId: ${saveResult.data.result.codeId}`);
}
