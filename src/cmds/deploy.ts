import fs, { promises as fsPromises } from 'node:fs';
import dotenv from 'dotenv';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  initializeApi,
  normalizeCardKey,
  validateFilePath,
  validateFilePathForWrite,
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
  
  const disableSpinner = options.spinner === true; // default false
  const spinner = createSpinner(!disableSpinner, '💳 starting deployment...').start();
  let envObject = {};
  const api = await initializeApi(credentials, options);

  if (options.env) {
    const envFilePath = `.env.${options.env}`;
    try {
      const normalizedEnvPath = await validateFilePath(envFilePath);
      spinner.text = `📦 uploading env from ${envFilePath}`;
      const envFileContent = await fsPromises.readFile(normalizedEnvPath, 'utf8');
      envObject = dotenv.parse(envFileContent);

      await api.uploadEnv(cardKey, { variables: envObject });
      spinner.text = '📦 env uploaded';
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
  spinner.text = '🚀 deploying code';
  const raw = { code: '' };
  
  const code = await fsPromises.readFile(normalizedFilename, 'utf8');
  raw.code = code;
  const saveResult = await api.uploadCode(cardKey, raw);
  await api.uploadPublishedCode(cardKey, saveResult.data.result.codeId, code);
  spinner.stop();
  console.log(`🎉 code deployed with codeId: ${saveResult.data.result.codeId}`);
}
