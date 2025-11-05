import fs from 'node:fs';
import { readFile, mkdir, access, constants, readdir, unlink, writeFile, chmod, rename, open } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { CliError, ERROR_CODES, ExitCode } from './errors.js';
import type { BasicOptions, Credentials } from './cmds/types.js';

/**
 * Determines the appropriate exit code based on error type.
 * @param error - The error to analyze
 * @param errorCode - Optional error code from CliError
 * @param errorMessage - The error message
 * @returns Exit code from ExitCode enum
 */
function determineExitCode(error: unknown, errorCode: string | undefined, errorMessage: string): ExitCode {
  const lowerMessage = errorMessage.toLowerCase();

  // Validation errors (invalid input, missing required fields)
  if (
    errorCode === ERROR_CODES.MISSING_CARD_KEY ||
    errorCode === ERROR_CODES.MISSING_ENV_FILE ||
    errorCode === ERROR_CODES.MISSING_ACCOUNT_ID ||
    errorCode === ERROR_CODES.MISSING_EMAIL_OR_PASSWORD ||
    errorCode === ERROR_CODES.INVALID_PROJECT_NAME ||
    errorCode === ERROR_CODES.INVALID_INPUT ||
    errorCode === ERROR_CODES.RATE_LIMIT_EXCEEDED ||
    lowerMessage.includes('received undefined') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('invalid')
  ) {
    return ExitCode.VALIDATION_ERROR;
  }

  // Authentication/authorization errors
  if (
    errorCode === ERROR_CODES.INVALID_CREDENTIALS ||
    errorCode === ERROR_CODES.MISSING_API_TOKEN ||
    lowerMessage.includes('credentials') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('invalid token')
  ) {
    return ExitCode.AUTH_ERROR;
  }

  // File system errors
  if (
    errorCode === ERROR_CODES.FILE_NOT_FOUND ||
    errorCode === ERROR_CODES.TEMPLATE_NOT_FOUND ||
    errorCode === ERROR_CODES.PROJECT_EXISTS ||
    lowerMessage.includes('file does not exist') ||
    lowerMessage.includes('enoent') ||
    lowerMessage.includes('no such file or directory')
  ) {
    return ExitCode.FILE_ERROR;
  }

  // Permission errors
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('eacces') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('eperm')
  ) {
    return ExitCode.PERMISSION_ERROR;
  }

  // Network-specific errors (connection issues) - check before API errors
  if (
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed')
  ) {
    return ExitCode.NETWORK_ERROR;
  }

  // API errors (server errors, deployment failures)
  if (
    errorCode === ERROR_CODES.DEPLOY_FAILED ||
    lowerMessage.includes('api') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('504')
  ) {
    return ExitCode.API_ERROR;
  }

  // Default to general error
  return ExitCode.GENERAL_ERROR;
}

/**
 * Handles and displays CLI errors with optional verbose output and actionable suggestions.
 * Exits the process with a specific exit code based on error type.
 * @param error - The error to handle (can be any type)
 * @param options - Options including verbose flag
 * @param context - Context string describing what operation failed
 */
export function handleCliError(error: unknown, options: { verbose?: boolean }, context: string) {
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  
  // Extract error code if it's a CliError
  let errorCode: string | undefined;
  if (error instanceof CliError) {
    errorCode = error.code;
  }

  // Determine appropriate exit code
  const exitCode = determineExitCode(error, errorCode, errorMessage);
  
  // Generate actionable suggestions based on error type and message
  let suggestion = '';
  const lowerMessage = errorMessage.toLowerCase();
  
  // File not found errors
  if (
    errorCode === ERROR_CODES.FILE_NOT_FOUND ||
    lowerMessage.includes('file does not exist') ||
    lowerMessage.includes('enoent') ||
    lowerMessage.includes('no such file or directory') ||
    lowerMessage.includes('received undefined') && lowerMessage.includes('path')
  ) {
    // Check if it's a missing filename error
    if (lowerMessage.includes('received undefined') && lowerMessage.includes('path')) {
      suggestion = '\n💡 Tip: Filename is required. Use -f or --filename to specify the file.';
    } else {
      suggestion = '\n💡 Tip: Check the file path and ensure the file exists.';
    }
  }
  // Card key errors
  else if (
    errorCode === ERROR_CODES.MISSING_CARD_KEY ||
    lowerMessage.includes('card key') ||
    lowerMessage.includes('card-key') ||
    lowerMessage.includes('cardkey')
  ) {
    suggestion = '\n💡 Tip: Use `ipb cards` to list your cards and get the card key, or provide it with `-c <card-key>`.';
  }
  // Credential/authentication errors
  else if (
    errorCode === ERROR_CODES.INVALID_CREDENTIALS ||
    errorCode === ERROR_CODES.MISSING_API_TOKEN ||
    lowerMessage.includes('credentials') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('invalid token')
  ) {
    suggestion = '\n💡 Tip: Run `ipb config` to set your credentials, or check your API keys in the Investec Developer Portal.';
  }
  // Missing env file errors
  else if (
    errorCode === ERROR_CODES.MISSING_ENV_FILE ||
    lowerMessage.includes('env file') ||
    lowerMessage.includes('.env.') && lowerMessage.includes('does not exist')
  ) {
    suggestion = '\n💡 Tip: Create the environment file (e.g., `.env.production`) or use a different environment name.';
  }
  // Missing account ID errors
  else if (
    errorCode === ERROR_CODES.MISSING_ACCOUNT_ID ||
    lowerMessage.includes('account id') ||
    lowerMessage.includes('accountid')
  ) {
    suggestion = '\n💡 Tip: Use `ipb accounts` to list your accounts and get the account ID.';
  }
  // Template errors
  else if (
    errorCode === ERROR_CODES.TEMPLATE_NOT_FOUND ||
    lowerMessage.includes('template does not exist')
  ) {
    suggestion = '\n💡 Tip: Check available templates or verify the template name is correct.';
  }
  // Project exists errors
  else if (
    errorCode === ERROR_CODES.PROJECT_EXISTS ||
    lowerMessage.includes('project') && lowerMessage.includes('exists')
  ) {
    suggestion = '\n💡 Tip: Use a different project name or remove the existing project directory.';
  }
  // Rate limit errors
  else if (
    errorCode === ERROR_CODES.RATE_LIMIT_EXCEEDED ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('too many requests')
  ) {
    const rateLimitInfo = detectRateLimit(error);
    if (rateLimitInfo) {
      suggestion = `\n💡 Tip: ${formatRateLimitInfo(rateLimitInfo)}. Please wait before retrying.`;
    } else {
      suggestion = '\n💡 Tip: API rate limit exceeded. Please wait a moment before retrying.';
    }
  }
  // Network/API errors
  else if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('timeout')
  ) {
    suggestion = '\n💡 Tip: Check your internet connection and verify the API host is accessible.';
  }
  // Permission errors
  else if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('eacces') ||
    lowerMessage.includes('access denied')
  ) {
    suggestion = '\n💡 Tip: Check file permissions or run with appropriate access rights.';
  }
  
  console.error(chalk.redBright(`Failed to ${context}:`), errorMessage);
  if (suggestion) {
    console.error(chalk.yellow(suggestion));
  }
  
  // In verbose mode, show rate limit information if available
  if (options.verbose) {
    const rateLimitInfo = detectRateLimit(error);
    if (rateLimitInfo) {
      console.log('');
      console.log(chalk.blue('Rate Limit Information:'));
      console.log(chalk.blue(`  ${formatRateLimitInfo(rateLimitInfo)}`));
    }
    console.log('');
    console.error('Error details:', error);
  } else {
    console.log('');
  }
  
  process.exit(exitCode);
}

/**
 * Wraps a command function to automatically capture and attach command context to errors.
 * When an error occurs, the command name is attached to the error object so it can be
 * used in error messages for better user feedback.
 * @param commandName - The name of the command (e.g., 'accounts', 'deploy')
 * @param handler - The command handler function
 * @returns Wrapped handler that attaches context to errors
 */
export function withCommandContext<T extends (...args: any[]) => Promise<any>>(
  commandName: string,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Attach command context to error
      if (error instanceof Error) {
        Object.defineProperty(error, 'commandContext', {
          value: commandName,
          writable: false,
          enumerable: false,
          configurable: true,
        });
      }
      throw error;
    }
  }) as T;
}

/**
 * Gets the path to the cache directory for storing update check timestamps.
 * @returns Path to the cache file
 */
function getUpdateCheckCachePath(): string {
  return path.join(homedir(), '.ipb', 'update-check.json');
}

/**
 * Gets the path to the command history file.
 * @returns Path to ~/.ipb/history.json
 */
export function getHistoryFilePath(): string {
  return path.join(homedir(), '.ipb', 'history.json');
}

/**
 * Command history entry structure.
 */
export interface CommandHistoryEntry {
  timestamp: number;
  command: string;
  args: string[];
  options: Record<string, unknown>;
  exitCode: number;
  duration?: number;
}

/**
 * Reads the command history from the history file.
 * @returns Array of command history entries, or empty array if file doesn't exist or is invalid
 */
export function readCommandHistory(): CommandHistoryEntry[] {
  try {
    const historyPath = getHistoryFilePath();
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      const history = JSON.parse(data) as CommandHistoryEntry[];
      return Array.isArray(history) ? history : [];
    }
  } catch {
    // Ignore errors reading history
  }
  return [];
}

/**
 * Writes command history to the history file.
 * Uses atomic writes to prevent corruption.
 * @param history - Array of command history entries
 */
async function writeCommandHistory(history: CommandHistoryEntry[]): Promise<void> {
  try {
    const historyPath = getHistoryFilePath();
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Keep only the last 1000 entries to prevent file from growing too large
    const trimmedHistory = history.slice(-1000);
    // Use atomic write for history file (less critical than credentials, but still good practice)
    const jsonData = JSON.stringify(trimmedHistory, null, 2);
    await writeFileAtomic(historyPath, jsonData);
  } catch {
    // Ignore errors writing history
  }
}

/**
 * Sanitizes sensitive data from command options and arguments.
 * Removes or redacts credentials, API keys, and other sensitive information.
 * @param options - Command options object
 * @returns Sanitized options object
 */
function sanitizeOptions(options: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = [
    'clientId',
    'clientSecret',
    'apiKey',
    'openaiKey',
    'sandboxKey',
    'cardKey',
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
  ];

  for (const [key, value] of Object.entries(options)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey.toLowerCase()));

    if (isSensitive && typeof value === 'string' && value.length > 0) {
      // Redact sensitive values (show first 4 chars and last 4 chars if long enough)
      if (value.length > 8) {
        sanitized[key] = `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
      } else {
        sanitized[key] = '***';
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes sensitive data from command arguments.
 * @param args - Command arguments array
 * @returns Sanitized arguments array
 */
function sanitizeArgs(args: string[]): string[] {
  return args.map((arg) => {
    // Check if argument looks like a sensitive value (API key, token, etc.)
    if (
      arg.length > 20 &&
      (arg.includes('key') || arg.includes('token') || arg.includes('secret') || arg.includes('password'))
    ) {
      return `${arg.substring(0, 4)}***${arg.substring(arg.length - 4)}`;
    }
    return arg;
  });
}

/**
 * Logs a command execution to the history file.
 * @param command - Command name (e.g., 'deploy', 'accounts')
 * @param args - Command arguments
 * @param options - Command options (will be sanitized)
 * @param exitCode - Exit code (0 for success, non-zero for errors)
 * @param duration - Optional command execution duration in milliseconds
 */
export async function logCommandHistory(
  command: string,
  args: string[],
  options: Record<string, unknown>,
  exitCode: number,
  duration?: number
): Promise<void> {
  try {
    const history = readCommandHistory();
    const entry: CommandHistoryEntry = {
      timestamp: Date.now(),
      command,
      args: sanitizeArgs(args),
      options: sanitizeOptions(options),
      exitCode,
      duration,
    };
    history.push(entry);
    await writeCommandHistory(history);
  } catch {
    // Silent failure - don't break command execution if history logging fails
  }
}

/**
 * Gets the timestamp of the last update check.
 * @returns Timestamp in milliseconds, or null if never checked
 */
function getLastUpdateCheck(): number | null {
  try {
    const cachePath = getUpdateCheckCachePath();
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return data.lastCheck || null;
    }
  } catch {
    // Ignore errors reading cache
  }
  return null;
}

/**
 * Updates the timestamp of the last update check.
 * Uses atomic writes to prevent corruption.
 */
async function setLastUpdateCheck(): Promise<void> {
  try {
    const cachePath = getUpdateCheckCachePath();
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Use atomic write for cache file
    const jsonData = JSON.stringify({ lastCheck: Date.now() }, null, 2);
    await writeFileAtomic(cachePath, jsonData);
  } catch {
    // Ignore errors writing cache
  }
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
    // Silent failure - don't warn users about version check failures
    return null;
  }
}

/**
 * Checks for updates with rate limiting (caches for 24 hours).
 * @param currentVersion - Current version of the CLI
 * @param force - Force check even if checked recently
 * @returns Promise that resolves to the latest version if available, or null
 */
export async function checkForUpdates(currentVersion: string, force = false): Promise<string | null> {
  const lastCheck = getLastUpdateCheck();
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Skip if checked recently (unless forced)
  if (!force && lastCheck && Date.now() - lastCheck < CACHE_DURATION) {
    return null;
  }

  try {
    const latest = await checkLatestVersion();
    
    // Update cache timestamp (even if check failed) - non-blocking
    setLastUpdateCheck().catch(() => {
      // Ignore errors
    });
    
    if (latest && latest !== currentVersion) {
      return latest;
    }
  } catch {
    // Silent failure
  }

  return null;
}

/**
 * Displays an update notification if a newer version is available.
 * @param currentVersion - Current version of the CLI
 * @param latestVersion - Latest available version
 */
export function showUpdateNotification(currentVersion: string, latestVersion: string): void {
  console.log(chalk.yellow(`\n⚠️  New version available: ${latestVersion} (current: ${currentVersion})`));
  console.log(chalk.yellow(`   Run: npm install -g investec-ipb@latest\n`));
}

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

export type TableData = TableRow[];

/**
 * Output formatting options for structured output.
 */
export interface OutputOptions {
  json?: boolean;
  yaml?: boolean;
  output?: string;
}

/**
 * Checks if stdout is piped (not a TTY).
 * @returns True if stdout is piped to another command
 */
export function isStdoutPiped(): boolean {
  return !process.stdout.isTTY && process.stdout.writable;
}

/**
 * Checks if stdin has data available (for piping).
 * @returns True if stdin has data piped from another command
 */
export function isStdinPiped(): boolean {
  return !process.stdin.isTTY && process.stdin.readable;
}

/**
 * Reads data from stdin if available.
 * @returns Promise that resolves to the stdin data, or null if no data available
 */
export async function readStdin(): Promise<string | null> {
  if (!isStdinPiped()) {
    return null;
  }

  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(data.trim() || null);
    });
    
    // Timeout after 100ms if no data arrives
    setTimeout(() => {
      if (!data) {
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Formats and outputs data in JSON, YAML, or table format, optionally writing to a file.
 * Automatically detects pipe mode and outputs JSON when piped.
 * @param data - Data to output (can be any JSON-serializable value)
 * @param options - Output options including JSON/YAML flags and output file path
 * @param showCount - Optional function to show count message after table output
 */
export async function formatOutput(
  data: unknown,
  options: OutputOptions,
  showCount?: (count: number) => void
): Promise<void> {
  // Auto-detect pipe mode: if stdout is piped, use JSON format
  const isPiped = isStdoutPiped();
  const autoJson = isPiped && !options.yaml && !options.output;
  
  // Determine output format: YAML takes precedence over JSON if both are specified
  const outputFormat = options.yaml ? 'yaml' : options.json || autoJson ? 'json' : null;
  const shouldOutputStructured = outputFormat || options.output;

  if (shouldOutputStructured) {
    let output: string;
    
    if (outputFormat === 'yaml') {
      const yaml = await import('js-yaml');
      output = yaml.dump(data, { indent: 2, lineWidth: -1 });
    } else {
      // Default to JSON if output file is specified without format flag
      output = JSON.stringify(data, null, 2);
    }

    if (options.output) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(options.output, output, 'utf8');
      if (!isPiped) {
        console.log(`Output written to ${options.output}`);
      }
    } else {
      // When piped, output directly to stdout without extra messages
      process.stdout.write(output);
    }
  } else {
    // Default table format for array data (only when not piped)
    if (Array.isArray(data)) {
      if (data.length === 0) {
        if (!isPiped) {
          console.log('No data to display.');
        }
        return;
      }
      if (!isPiped) {
        printTable(data as TableData);
        if (showCount) {
          showCount(data.length);
        }
      } else {
        // When piped, output as JSON
        process.stdout.write(JSON.stringify(data, null, 2));
      }
    } else {
      // For non-array data, output as JSON
      if (isPiped) {
        process.stdout.write(JSON.stringify(data, null, 2));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 * @param value - The value to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string
 */
function truncateValue(value: unknown, maxLength: number): string {
  const str = String(value ?? '');
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Converts a value to a string representation, handling nested objects.
 * @param value - The value to convert
 * @param maxLength - Maximum length for string values
 * @returns String representation
 */
function formatCellValue(value: unknown, maxLength: number = 50): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    // Handle nested objects by converting to JSON
    try {
      const json = JSON.stringify(value);
      return truncateValue(json, maxLength);
    } catch {
      return String(value);
    }
  }
  return truncateValue(value, maxLength);
}

/**
 * Determines column alignment based on data type.
 * @param header - Column header name
 * @param sampleData - Sample data to analyze
 * @returns Alignment ('left' | 'right' | 'center')
 */
function determineAlignment(header: string, sampleData: TableData): 'left' | 'right' | 'center' {
  // Check if header name suggests numeric data
  const numericPattern = /^(amount|balance|price|cost|total|count|id|key|number)$/i;
  if (numericPattern.test(header)) {
    return 'right';
  }
  
  // Check actual data types in sample
  const sampleValues = sampleData.slice(0, 10).map((row) => row[header]);
  const allNumeric = sampleValues.length > 0 && sampleValues.every((val) => {
    if (val === null || val === undefined || val === '') return false;
    const num = Number(val);
    return !Number.isNaN(num) && isFinite(num);
  });
  
  if (allNumeric) {
    return 'right';
  }
  
  // Boolean values can be centered
  if (sampleValues.every((val) => typeof val === 'boolean')) {
    return 'center';
  }
  
  return 'left';
}

/**
 * Prints tabular data to the console in a formatted table with improved formatting.
 * Uses cli-table3 for better column alignment, borders, and handling of long values.
 * @param data - Array of row objects to display
 */
export function printTable(data: TableData): void {
  if (!data || data.length === 0) {
    console.log('No data to display.');
    return;
  }

  try {
    // Use cli-table3 for better formatting
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Table = require('cli-table3');
    const headers: string[] = Object.keys(data[0] as TableRow);
    
    // Determine column widths (max 80 chars per column, min 10)
    // Use terminal width if available, otherwise default to 120
    const terminalWidth = process.stdout.columns || 120;
    const maxWidth = Math.min(80, Math.max(10, Math.floor(terminalWidth / headers.length)));
    
    // Create table with column configurations
    const table = new Table({
      head: headers.map((h) => chalk.bold(h)),
      style: {
        head: [],
        border: ['gray'],
        compact: false,
      },
      colWidths: headers.map(() => maxWidth),
      colAligns: headers.map((header) => determineAlignment(header, data)),
      wordWrap: true,
    });

    // Add rows with formatted values
    data.forEach((row) => {
      const rowData = headers.map((header) => {
        const value = row[header];
        return formatCellValue(value, maxWidth);
      });
      table.push(rowData);
    });

    console.log(table.toString());
  } catch (error) {
    // Fallback to basic formatting if cli-table3 is not available
    const headers: string[] = Object.keys(data[0] as TableRow);
    const colWidths: number[] = headers.map((header) =>
      Math.max(header.length, ...data.map((row) => String(row[header] ?? '').length))
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
        .map((header, index) => String(row[header] ?? '').padEnd(colWidths[index] ?? 0))
        .join(' | ');
      console.log(dataRow);
    });
  }
}

/**
 * Normalizes a file path by expanding ~ to home directory and resolving relative paths.
 * @param filePath - The file path to normalize
 * @returns Normalized absolute path
 */
export function normalizeFilePath(filePath: string): string {
  // Expand ~ to home directory
  if (filePath.startsWith('~/') || filePath === '~') {
    filePath = filePath.replace('~', homedir());
  }
  
  // Resolve relative paths to absolute paths
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }
  
  return path.normalize(filePath);
}

/**
 * Validates file extension against allowed extensions.
 * @param filePath - The file path to validate
 * @param allowedExtensions - Array of allowed extensions (e.g., ['.js', '.json'])
 * @param operation - Operation type for error messages (e.g., 'read', 'write')
 * @throws {CliError} When file extension is not allowed
 */
export function validateFileExtension(
  filePath: string,
  allowedExtensions: string[],
  operation: string = 'access'
): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Invalid file extension for ${operation} operation. Allowed extensions: ${allowedExtensions.join(', ')}. Got: ${ext || 'no extension'}`
    );
  }
}

/**
 * Checks file permissions before operations.
 * @param filePath - The file path to check
 * @param operation - Operation type ('read' or 'write')
 * @throws {CliError} When file doesn't exist or lacks required permissions
 */
export async function checkFilePermissions(
  filePath: string,
  operation: 'read' | 'write' = 'read'
): Promise<void> {
  const normalizedPath = normalizeFilePath(filePath);
  
  try {
    if (operation === 'read') {
      await access(normalizedPath, constants.R_OK);
    } else {
      // For write, check if parent directory is writable
      const dir = path.dirname(normalizedPath);
      await access(dir, constants.W_OK);
      // If file exists, check if it's writable
      try {
        await access(normalizedPath, constants.F_OK);
        await access(normalizedPath, constants.W_OK);
      } catch {
        // File doesn't exist yet, that's fine for write operations
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('ENOENT')) {
      if (operation === 'read') {
        throw new CliError(
          ERROR_CODES.FILE_NOT_FOUND,
          `File "${normalizedPath}" does not exist. Check the file path and ensure the file exists.`
        );
      }
      // For write, missing file is OK, but parent directory must exist
      throw new CliError(
        ERROR_CODES.FILE_NOT_FOUND,
        `Directory "${path.dirname(normalizedPath)}" does not exist. Create the directory first.`
      );
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
      throw new CliError(
        ERROR_CODES.FILE_NOT_FOUND,
        `Permission denied: Cannot ${operation} file "${normalizedPath}". Check file permissions.`
      );
    }
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Cannot ${operation} file "${normalizedPath}": ${errorMessage}`
    );
  }
}

/**
 * Validates and normalizes a file path for read operations.
 * @param filePath - The file path to validate and normalize
 * @param allowedExtensions - Optional array of allowed extensions
 * @returns Normalized absolute path
 * @throws {CliError} When validation fails
 */
export async function validateFilePath(
  filePath: string,
  allowedExtensions?: string[]
): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'File path is required and cannot be empty.'
    );
  }
  
  const normalizedPath = normalizeFilePath(filePath);
  
  if (allowedExtensions && allowedExtensions.length > 0) {
    validateFileExtension(normalizedPath, allowedExtensions, 'read');
  }
  
  await checkFilePermissions(normalizedPath, 'read');
  
  return normalizedPath;
}

/**
 * Validates and normalizes a file path for write operations.
 * @param filePath - The file path to validate and normalize
 * @param allowedExtensions - Optional array of allowed extensions
 * @returns Normalized absolute path
 * @throws {CliError} When validation fails
 */
export async function validateFilePathForWrite(
  filePath: string,
  allowedExtensions?: string[]
): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'File path is required and cannot be empty.'
    );
  }
  
  const normalizedPath = normalizeFilePath(filePath);
  
  if (allowedExtensions && allowedExtensions.length > 0) {
    validateFileExtension(normalizedPath, allowedExtensions, 'write');
  }
  
  await checkFilePermissions(normalizedPath, 'write');
  
  return normalizedPath;
}

/**
 * Validates an amount value for financial transactions.
 * @param amount - The amount to validate
 * @param maxDecimals - Maximum number of decimal places allowed (default: 2)
 * @throws {CliError} When amount is invalid (not positive, NaN, or has too many decimals)
 */
export function validateAmount(amount: number, maxDecimals = 2): void {
  if (Number.isNaN(amount)) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be a valid number');
  }
  
  if (amount <= 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be positive');
  }
  
  if (!Number.isFinite(amount)) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be a finite number');
  }
  
  // Check decimal precision
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > maxDecimals) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `Amount can have at most ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'}. Found ${decimalPlaces} decimal place${decimalPlaces === 1 ? '' : 's'}.`
    );
  }
}

/**
 * Validates an account ID format.
 * @param accountId - The account ID to validate
 * @throws {CliError} When account ID is invalid (empty, whitespace only, or invalid format)
 */
export function validateAccountId(accountId: string): void {
  if (!accountId || accountId.trim().length === 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID is required and cannot be empty');
  }
  
  // Basic format validation: account IDs should not contain certain characters
  // and should have reasonable length (typically 6-50 characters)
  const trimmedId = accountId.trim();
  
  if (trimmedId.length < 3) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID must be at least 3 characters long');
  }
  
  if (trimmedId.length > 100) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID cannot exceed 100 characters');
  }
  
  // Check for path traversal attempts or other suspicious patterns
  if (trimmedId.includes('..') || trimmedId.includes('/') || trimmedId.includes('\\')) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID contains invalid characters');
  }
}

/**
 * Prompts for user confirmation before executing a destructive operation.
 * @param message - The confirmation message to display
 * @param options - Options including `yes` flag to skip confirmation
 * @returns Promise that resolves to true if confirmed, false otherwise
 */
export async function confirmDestructiveOperation(
  message: string,
  options: { yes?: boolean } = {}
): Promise<boolean> {
  // Skip confirmation if --yes flag is set
  if (options.yes === true) {
    return true;
  }

  // Only prompt if stdout is a TTY (interactive terminal)
  // Check if stdout is a TTY directly to avoid circular import
  const isPiped = !process.stdout.isTTY;
  if (isPiped) {
    // In non-interactive mode, require --yes flag
    return false;
  }

  // Use dynamic import to avoid loading @inquirer/prompts for all commands
  const { confirm } = await import('@inquirer/prompts');
  
  try {
    const confirmed = await confirm({
      message,
      default: false,
    });
    return confirmed;
  } catch {
    // If confirmation fails (e.g., user cancels), return false
    return false;
  }
}

/**
 * Default credentials structure with all fields initialized to empty strings.
 */
const defaultCreds = {
  clientId: '',
  clientSecret: '',
  apiKey: '',
  cardKey: '',
  openaiKey: '',
  sandboxKey: '',
};

/**
 * Reads credentials from file synchronously (for module initialization).
 * @param credentialLocation - The credential location object with filename and folder
 * @param onError - Optional callback to handle errors (for non-throwing behavior)
 * @returns Credentials object with values from file, or default empty strings if file doesn't exist or parsing fails
 */
export function readCredentialsFileSync(
  credentialLocation: { filename: string; folder: string },
  onError?: (error: Error) => void
): Record<string, string> {
  if (fs.existsSync(credentialLocation.filename)) {
    try {
      const data = fs.readFileSync(credentialLocation.filename, 'utf8');
      return { ...defaultCreds, ...JSON.parse(data) };
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      return defaultCreds;
    }
  }
  return defaultCreds;
}

/**
 * Reads credentials from the default credentials file location (async version).
 * @param credentialLocation - The credential location object with filename and folder
 * @returns Credentials object with values from file, or empty strings if file doesn't exist
 * @throws {Error} When the credentials file exists but cannot be parsed
 */
export async function readCredentialsFile(credentialLocation: {
  filename: string;
  folder: string;
}): Promise<Record<string, string>> {
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
 * Validates that required credential fields are present and non-empty.
 * @param creds - Credentials object to validate
 * @param requiredFields - Array of required field names (defaults to API credentials)
 * @throws {CliError} When required fields are missing or empty
 */
export function validateCredentialsFile(
  creds: Credentials | Record<string, string>,
  requiredFields: string[] = ['clientId', 'clientSecret', 'apiKey']
): void {
  const credsRecord = creds as Record<string, string>;
  const missing = requiredFields.filter(
    (field) => !credsRecord[field] || (typeof credsRecord[field] === 'string' && credsRecord[field].trim() === '')
  );

  if (missing.length > 0) {
    throw new CliError(
      ERROR_CODES.INVALID_CREDENTIALS,
      `Missing required credential fields: ${missing.join(', ')}. Run 'ipb config' to set your credentials.`
    );
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

import ora from 'ora';
import { optionCredentials } from './index.js';
import type { ICardApi } from './mock-card.js';
import type { IPbApi } from './mock-pb.js';

/**
 * Writes a file atomically using a temporary file and rename.
 * This ensures the file is either completely written or not written at all,
 * preventing corruption from crashes or interruptions.
 * @param filepath - Target file path
 * @param data - Data to write (string or Buffer)
 * @param options - Write options including permissions
 * @throws {Error} When file operations fail
 */
export async function writeFileAtomic(
  filepath: string,
  data: string | Buffer,
  options: { permissions?: number } = {}
): Promise<void> {
  const dir = path.dirname(filepath);
  const filename = path.basename(filepath);
  const tempPath = path.join(dir, `.${filename}.tmp`);
  
  try {
    // Ensure directory exists
    await ensureCredentialsDirectory({ folder: dir });
    
    // Write to temp file
    await writeFile(tempPath, data, { encoding: 'utf8', flag: 'w' });
    
    // Ensure data is flushed to disk before renaming
    const fd = await open(tempPath, 'r+');
    try {
      await fd.sync();
    } finally {
      await fd.close();
    }
    
    // Set permissions on temp file (if specified)
    if (options.permissions !== undefined) {
      await chmod(tempPath, options.permissions);
    }
    
    // Atomically rename temp file to target (rename is atomic on most filesystems)
    await rename(tempPath, filepath);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (fs.existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch {
      // Ignore cleanup errors - the temp file will be cleaned up later
    }
    throw error;
  }
}

/**
 * Cleans up any stale temporary files in a directory.
 * Removes temporary files that are older than 1 hour (likely from crashed operations).
 * @param dir - Directory to clean
 */
export async function cleanupTempFiles(dir: string): Promise<void> {
  try {
    if (!fs.existsSync(dir)) {
      return;
    }
    const files = await readdir(dir);
    const tempFiles = files.filter((f) => f.endsWith('.tmp'));
    const now = Date.now();
    
    for (const file of tempFiles) {
      const filePath = path.join(dir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        // Remove temp files older than 1 hour (likely stale)
        if (now - stats.mtimeMs > 3600000) {
          await unlink(filePath);
        }
      } catch {
        // Ignore errors for individual files
      }
    }
  } catch {
    // Ignore errors - cleanup is best-effort
  }
}

/**
 * Write credentials file with secure permissions (read/write for owner only).
 * Uses atomic writes to prevent corruption.
 * @param filepath - Path to the credentials file
 * @param data - Credentials data to write
 * @throws {Error} When file operations fail
 */
export async function writeCredentialsFile(
  filepath: string,
  data: Record<string, string>
): Promise<void> {
  const jsonData = JSON.stringify(data, null, 2);
  await writeFileAtomic(filepath, jsonData, { permissions: 0o600 });
}

/**
 * Gets the profiles directory path.
 * @returns Path to the profiles directory
 */
export function getProfilesDirectory(): string {
  return path.join(homedir(), '.ipb', 'profiles');
}

/**
 * Gets the active profile config file path.
 * @returns Path to the active profile config file
 */
export function getActiveProfileConfigPath(): string {
  return path.join(homedir(), '.ipb', 'active-profile.json');
}

/**
 * Gets the file path for a specific profile.
 * @param profileName - Name of the profile
 * @returns Path to the profile file
 */
export function getProfilePath(profileName: string): string {
  const profilesDir = getProfilesDirectory();
  return path.join(profilesDir, `${profileName}.json`);
}

/**
 * Lists all available profiles.
 * @returns Array of profile names
 */
export async function listProfiles(): Promise<string[]> {
  const profilesDir = getProfilesDirectory();
  if (!fs.existsSync(profilesDir)) {
    return [];
  }
  
  try {
    const files = await readdir(profilesDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Reads a profile file.
 * @param profileName - Name of the profile to read
 * @returns Credentials object from the profile, or default empty strings if profile doesn't exist
 * @throws {Error} When the profile file exists but cannot be parsed
 */
export async function readProfile(profileName: string): Promise<Record<string, string>> {
  const profilePath = getProfilePath(profileName);
  if (!fs.existsSync(profilePath)) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Profile "${profileName}" does not exist. Use 'ipb config profile list' to see available profiles.`
    );
  }
  
  try {
    const data = await readFile(profilePath, 'utf8');
    return { ...defaultCreds, ...JSON.parse(data) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(
      ERROR_CODES.INVALID_CREDENTIALS,
      `Failed to read profile "${profileName}": ${message}`
    );
  }
}

/**
 * Writes a profile file with secure permissions.
 * @param profileName - Name of the profile to write
 * @param data - Credentials data to write
 */
export async function writeProfile(profileName: string, data: Record<string, string>): Promise<void> {
  const profilesDir = getProfilesDirectory();
  await ensureCredentialsDirectory({ folder: profilesDir });
  
  const profilePath = getProfilePath(profileName);
  await writeCredentialsFile(profilePath, data);
}

/**
 * Deletes a profile file.
 * @param profileName - Name of the profile to delete
 * @throws {Error} When the profile doesn't exist
 */
export async function deleteProfile(profileName: string): Promise<void> {
  const profilePath = getProfilePath(profileName);
  if (!fs.existsSync(profilePath)) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Profile "${profileName}" does not exist.`
    );
  }
  
  try {
    await access(profilePath, constants.F_OK);
    await unlink(profilePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Failed to delete profile "${profileName}": ${message}`
    );
  }
}

/**
 * Gets the currently active profile name.
 * @returns Active profile name, or null if no profile is set
 */
export async function getActiveProfile(): Promise<string | null> {
  const activeProfilePath = getActiveProfileConfigPath();
  if (!fs.existsSync(activeProfilePath)) {
    return null;
  }
  
  try {
    const data = await readFile(activeProfilePath, 'utf8');
    const config = JSON.parse(data);
    return config.profile || null;
  } catch {
    return null;
  }
}

/**
 * Sets the active profile name.
 * Uses atomic writes to prevent corruption.
 * @param profileName - Name of the profile to set as active, or null to clear
 * @throws {Error} When file operations fail
 */
export async function setActiveProfile(profileName: string | null): Promise<void> {
  const activeProfilePath = getActiveProfileConfigPath();
  const configDir = path.dirname(activeProfilePath);
  
  await ensureCredentialsDirectory({ folder: configDir });
  
  if (profileName === null) {
    // Remove active profile config
    if (fs.existsSync(activeProfilePath)) {
      await unlink(activeProfilePath);
    }
  } else {
    // Write active profile config using atomic write
    const jsonData = JSON.stringify({ profile: profileName }, null, 2);
    await writeFileAtomic(activeProfilePath, jsonData, { permissions: 0o600 });
  }
}

/**
 * Loads credentials from a profile if specified, otherwise uses default credentials.
 * @param credentials - Base credentials object
 * @param profileName - Optional profile name to load
 * @returns Updated credentials object with profile data merged in
 */
export async function loadProfile(credentials: Credentials, profileName?: string): Promise<Credentials> {
  if (!profileName) {
    return credentials;
  }
  
  try {
    const profileData = await readProfile(profileName);
    // Merge profile data into credentials (profile takes precedence over defaults)
    return {
      ...credentials,
      ...profileData,
    };
  } catch (error) {
    // If profile doesn't exist, throw a helpful error
    if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
      throw error;
    }
    // Otherwise, rethrow the error
    throw error;
  }
}

/**
 * Rate limit information extracted from API responses or errors.
 */
export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  reset?: number; // Unix timestamp when rate limit resets
  retryAfter?: number; // Seconds to wait before retrying
}

/**
 * Detects rate limit information from an error.
 * Checks for 429 status codes, rate limit headers, or rate limit error messages.
 * @param error - The error to check
 * @returns Rate limit information if detected, null otherwise
 */
export function detectRateLimit(error: unknown): RateLimitInfo | null {
  if (!error) {
    return null;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for 429 status code or rate limit keywords
  if (
    errorMessage.includes('429') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('ratelimit') ||
    lowerMessage.includes('rate-limit')
  ) {
    const info: RateLimitInfo = {};

    // Try to extract retry-after from error message
    const retryAfterMatch = errorMessage.match(/retry[-\s]after[:\s]+(\d+)/i);
    if (retryAfterMatch && retryAfterMatch[1]) {
      const retryValue = parseInt(retryAfterMatch[1], 10);
      if (!Number.isNaN(retryValue)) {
        info.retryAfter = retryValue;
      }
    }

    // Try to extract reset time from error message
    const resetMatch = errorMessage.match(/reset[:\s]+(\d+)/i);
    if (resetMatch && resetMatch[1]) {
      const resetValue = parseInt(resetMatch[1], 10);
      if (!Number.isNaN(resetValue)) {
        info.reset = resetValue;
      }
    }

    // Check if error object has response/headers (common in fetch responses)
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { status?: number; headers?: Headers | Record<string, string> } }).response;
      if (response?.headers) {
        const headers = response.headers;
        
        // Extract rate limit headers (common patterns)
        const getHeader = (name: string): string | null => {
          if (headers instanceof Headers) {
            return headers.get(name);
          }
          if (typeof headers === 'object' && headers !== null) {
            const headerObj = headers as Record<string, string | undefined>;
            // Case-insensitive lookup
            const key = Object.keys(headerObj).find((k) => k.toLowerCase() === name.toLowerCase());
            return key && headerObj[key] ? headerObj[key] : null;
          }
          return null;
        };

        const rateLimitLimit = getHeader('x-ratelimit-limit') || getHeader('ratelimit-limit');
        const rateLimitRemaining = getHeader('x-ratelimit-remaining') || getHeader('ratelimit-remaining');
        const rateLimitReset = getHeader('x-ratelimit-reset') || getHeader('ratelimit-reset');
        const retryAfter = getHeader('retry-after');

        if (rateLimitLimit) {
          const limitValue = parseInt(rateLimitLimit, 10);
          if (!Number.isNaN(limitValue)) {
            info.limit = limitValue;
          }
        }
        if (rateLimitRemaining) {
          const remainingValue = parseInt(rateLimitRemaining, 10);
          if (!Number.isNaN(remainingValue)) {
            info.remaining = remainingValue;
          }
        }
        if (rateLimitReset) {
          const resetValue = parseInt(rateLimitReset, 10);
          if (!Number.isNaN(resetValue)) {
            info.reset = resetValue;
          }
        }
        if (retryAfter) {
          const retryValue = parseInt(retryAfter, 10);
          if (!Number.isNaN(retryValue)) {
            info.retryAfter = retryValue;
          }
        }
      }
    }

    return Object.keys(info).length > 0 ? info : { retryAfter: 60 }; // Default to 60 seconds if no info found
  }

  return null;
}

/**
 * Formats rate limit information for display.
 * @param info - Rate limit information
 * @returns Formatted string
 */
export function formatRateLimitInfo(info: RateLimitInfo): string {
  const parts: string[] = [];

  if (info.limit !== undefined && info.remaining !== undefined) {
    parts.push(`Rate limit: ${info.remaining}/${info.limit} requests remaining`);
  }

  if (info.retryAfter) {
    const minutes = Math.floor(info.retryAfter / 60);
    const seconds = info.retryAfter % 60;
    if (minutes > 0) {
      parts.push(`Retry after: ${minutes}m ${seconds}s`);
    } else {
      parts.push(`Retry after: ${seconds}s`);
    }
  } else if (info.reset) {
    const resetDate = new Date(info.reset * 1000);
    const now = Date.now();
    const waitTime = Math.max(0, Math.ceil((resetDate.getTime() - now) / 1000));
    if (waitTime > 0) {
      const minutes = Math.floor(waitTime / 60);
      const seconds = waitTime % 60;
      if (minutes > 0) {
        parts.push(`Rate limit resets in: ${minutes}m ${seconds}s`);
      } else {
        parts.push(`Rate limit resets in: ${seconds}s`);
      }
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'Rate limit exceeded';
}

/**
 * Sleeps for a specified number of milliseconds.
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay.
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 60000)
 * @param jitter - Whether to add random jitter (default: true)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 60000,
  jitter = true
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  if (jitter) {
    // Add random jitter (±25%) to prevent thundering herd
    const jitterAmount = exponentialDelay * 0.25;
    const jitterValue = (Math.random() * 2 - 1) * jitterAmount;
    return Math.max(0, exponentialDelay + jitterValue);
  }
  return exponentialDelay;
}

/**
 * Executes a function with retry logic and exponential backoff for rate limit errors.
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Result of the function
 * @throws {CliError} When max retries exceeded or non-retryable error occurs
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    verbose?: boolean;
    onRetry?: (attempt: number, error: unknown, delay: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 60000,
    verbose = false,
    onRetry,
  } = options;

  let lastError: unknown;
  let lastRateLimitInfo: RateLimitInfo | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if this is a rate limit error
      const rateLimitInfo = detectRateLimit(error);
      if (rateLimitInfo && attempt < maxRetries) {
        lastRateLimitInfo = rateLimitInfo;

        // Use retryAfter from rate limit info if available, otherwise use exponential backoff
        const delay = rateLimitInfo.retryAfter
          ? rateLimitInfo.retryAfter * 1000
          : calculateBackoffDelay(attempt, baseDelay, maxDelay);

        if (verbose) {
          console.log(
            chalk.yellow(
              `⚠️  Rate limit exceeded. ${formatRateLimitInfo(rateLimitInfo)}. Retrying in ${Math.ceil(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries + 1})`
            )
          );
        }

        if (onRetry) {
          onRetry(attempt, error, delay);
        }

        await sleep(delay);
        continue;
      }

      // Not a rate limit error or max retries exceeded
      throw error;
    }
  }

  // All retries exhausted
  if (lastRateLimitInfo) {
    throw new CliError(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded after ${maxRetries + 1} attempts. ${formatRateLimitInfo(lastRateLimitInfo)}`
    );
  }

  throw lastError;
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
    // No-op spinner: does not log anything (for pipe mode)
    return {
      start(_msg?: string) {
        // Don't log anything when disabled (pipe mode)
        return this;
      },
      stop() {
        // Don't log anything when disabled
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
  // Validate required credentials before initializing API
  validateCredentialsFile(credentials);
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
  // Validate required credentials before initializing API
  validateCredentialsFile(credentials);
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
