import fs from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import chalk from 'chalk';
import { CliError, ERROR_CODES } from './errors.js';
import type { BasicOptions, Credentials } from './cmds/types.js';

/**
 * Handles and displays CLI errors with optional verbose output.
 * Exits the process with code 1 after displaying the error.
 * @param error - The error to handle (can be any type)
 * @param options - Options including verbose flag
 * @param context - Context string describing what operation failed
 */
export function handleCliError(error: unknown, options: { verbose?: boolean }, context: string) {
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  console.error(chalk.redBright(`Failed to ${context}:`), errorMessage);
  console.log('');
  if (options.verbose) {
    console.error(error);
  }
  process.exit(1);
}

/**
 * Checks the latest version of the package from npm registry.
 * @returns The latest version string, or null if the check fails
 */
export async function checkLatestVersion() {
  try {
    const response = await fetch('https://registry.npmjs.org/investec-ipb', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.npm.install-v1+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.statusText}`);
    }

    const data = (await response.json()) as { 'dist-tags': { latest: string } };
    const latestVersion = data['dist-tags'].latest;

    return latestVersion;
  } catch (error) {
    console.warn('Failed to check latest version:', error);
    return null;
  }
}

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

export type TableData = TableRow[];

/**
 * Prints tabular data to the console in a formatted table.
 * @param data - Array of row objects to display
 */
export function printTable(data: TableData): void {
  if (!data || data.length === 0) {
    console.log('No data to display.');
    return;
  }

  // Determine column widths based on header and data length
  const headers: string[] = Object.keys(data[0] as TableRow);
  const colWidths: number[] = headers.map((header) =>
    Math.max(header.length, ...data.map((row) => String(row[header]).length))
  );

  // Print header row
  const headerRow: string = headers
    .map((header, index) => header.padEnd(colWidths[index] ?? 0))
    .join(' | ');
  console.log(headerRow);
  console.log('-'.repeat(headerRow.length));

  // Print data rows
  data.forEach((row) => {
    const dataRow: string = headers
      .map((header, index) => String(row[header]).padEnd(colWidths[index] ?? 0))
      .join(' | ');
    console.log(dataRow);
  });
}

/**
 * Reads credentials from the default credentials file location.
 * @param credentialLocation - The credential location object with filename and folder
 * @returns Credentials object with values from file, or empty strings if file doesn't exist
 * @throws {Error} When the credentials file exists but cannot be parsed
 */
export async function readCredentialsFile(credentialLocation: {
  filename: string;
  folder: string;
}): Promise<Record<string, string>> {
  const defaultCreds = {
    clientId: '',
    clientSecret: '',
    apiKey: '',
    cardKey: '',
    openaiKey: '',
    sandboxKey: '',
  };

  try {
    if (fs.existsSync(credentialLocation.filename)) {
      const data = await readFile(credentialLocation.filename, 'utf8');
      return { ...defaultCreds, ...JSON.parse(data) };
    }
    return defaultCreds;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read credentials file: ${message}`);
  }
}

/**
 * Ensures the credentials directory exists, creating it if necessary.
 * @param credentialLocation - The credential location object with folder path
 */
export async function ensureCredentialsDirectory(credentialLocation: {
  folder: string;
}): Promise<void> {
  if (!fs.existsSync(credentialLocation.folder)) {
    await mkdir(credentialLocation.folder, { recursive: true });
  }
}

/**
 * Loads credentials from a JSON file and merges them with existing credentials.
 * @param credentials - Existing credentials object to merge into
 * @param credentialsFile - Path to the credentials file
 * @returns Updated credentials object
 * @throws {Error} When the credentials file cannot be loaded
 */
export async function loadCredentialsFile(credentials: Credentials, credentialsFile: string) {
  if (credentialsFile) {
    try {
      const file = await import(`file://${credentialsFile}`, {
        with: { type: 'json' },
      });

      // Only copy known credential properties
      const credentialKeys: (keyof Credentials)[] = [
        'host',
        'apiKey',
        'clientId',
        'clientSecret',
        'openaiKey',
        'sandboxKey',
        'cardKey',
      ];

      credentialKeys.forEach((key) => {
        if (file[key] !== undefined) {
          credentials[key] = file[key];
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load credentials file: ${message}`);
    }
  }
  return credentials;
}

import { writeFile, chmod } from 'node:fs/promises';
import ora from 'ora';
import { optionCredentials } from './index.js';
import type { ICardApi } from './mock-card.js';
import type { IPbApi } from './mock-pb.js';

/**
 * Write credentials file with secure permissions (read/write for owner only)
 * @param filepath - Path to the credentials file
 * @param data - Credentials data to write
 */
export async function writeCredentialsFile(
  filepath: string,
  data: Record<string, string>
): Promise<void> {
  await writeFile(filepath, JSON.stringify(data, null, 2), {
    encoding: 'utf8',
    flag: 'w',
  });
  // Set file permissions to read/write for owner only (0o600)
  await chmod(filepath, 0o600);
}

// Spinner abstraction for testability and control
export interface Spinner {
  start: (text?: string) => Spinner;
  stop: () => Spinner;
  text?: string;
}

/**
 * Creates a spinner instance for displaying loading indicators.
 * @param enabled - Whether the spinner should be enabled (animated) or disabled (no-op)
 * @param text - Initial text to display
 * @returns A Spinner instance
 */
export function createSpinner(enabled: boolean, text: string): Spinner {
  if (!enabled) {
    // No-op spinner: logs start/stop messages but does not animate
    return {
      start(msg?: string) {
        if (msg || text) console.log(msg || text);
        return this;
      },
      stop() {
        // Optionally log stop if needed
        return this;
      },
    };
  }
  // Real spinner
  return ora(text);
}

/**
 * Initializes the Programmable Banking API client.
 * @param credentials - API credentials
 * @param options - Basic options including credential overrides
 * @returns Initialized IPbApi instance
 * @throws {Error} When API initialization fails
 */
export async function initializePbApi(
  credentials: Credentials,
  options: BasicOptions
): Promise<IPbApi> {
  credentials = await optionCredentials(options, credentials);
  let api: IPbApi;
  if (process.env.DEBUG === 'true') {
    const { PbApi } = await import('./mock-pb.js');
    api = new PbApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host
    );
  } else {
    const { InvestecPbApi } = await import('investec-pb-api');
    api = new InvestecPbApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host
    );
  }
  await api.getAccessToken();
  return api;
}

/**
 * Normalizes cardKey to a number, handling both string and number inputs.
 * @param cardKey - Card key as string or number
 * @param credentialsCardKey - Fallback card key from credentials (string)
 * @returns Normalized card key as number
 * @throws {CliError} When card key cannot be determined or is invalid
 */
export function normalizeCardKey(
  cardKey: string | number | undefined,
  credentialsCardKey: string
): number {
  if (cardKey !== undefined) {
    const num = typeof cardKey === 'string' ? Number(cardKey) : cardKey;
    if (Number.isNaN(num)) {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'Invalid card key: must be a number');
    }
    return num;
  }
  if (credentialsCardKey === '') {
    throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
  }
  const num = Number(credentialsCardKey);
  if (Number.isNaN(num)) {
    throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'Invalid card key in credentials: must be a number');
  }
  return num;
}

/**
 * Initializes the Card API client.
 * @param credentials - API credentials
 * @param options - Basic options including credential overrides
 * @returns Initialized ICardApi instance
 * @throws {Error} When API initialization fails
 */
export async function initializeApi(
  credentials: Credentials,
  options: BasicOptions
): Promise<ICardApi> {
  credentials = await optionCredentials(options, credentials);
  let api: ICardApi;
  if (process.env.DEBUG === 'true') {
    const { CardApi } = await import('./mock-card.js');
    api = new CardApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host
    );
  } else {
    const { InvestecCardApi } = await import('investec-card-api');
    api = new InvestecCardApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host
    );
  }
  await api.getAccessToken();
  return api;
}
