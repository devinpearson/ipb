import { spawn } from 'node:child_process';
import fs from 'node:fs';
import {
  access,
  chmod,
  constants,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import type { BasicOptions, Credentials } from './cmds/types.js';
import { CliError, ERROR_CODES, ExitCode } from './errors.js';
import { normalizeInvestecError } from './utils/investec-errors.js';
import { getVerboseMode, isDebugEnabled, resolveSpinnerState } from './utils/runtime-flags.js';
import type { Spinner } from './utils/spinner.js';
import { createSpinner, stopSpinner, withSpinner, withSpinnerOutcome } from './utils/spinner.js';
import {
  detectTerminalCapabilities,
  getSafeText,
  getTerminalCapabilities,
  getTerminalDimensions,
  isStdinPiped,
  isStdoutPiped,
  readStdin,
  safeLog,
} from './utils/terminal.js';
import {
  formatOutput,
  printTable,
  type OutputOptions,
  type TableData,
  type TableRow,
} from './utils/output.js';
import { runListCommand, runReadUploadCommand, runWriteCommand } from './utils/command-runners.js';
import { formatFileSize, getFileSize } from './utils/file-size.js';
import { initializeApi, initializePbApi, normalizeCardKey } from './utils/api.js';
import { validateCredentialsFile } from './utils/credentials-validation.js';

/**
 * Configures chalk to respect NO_COLOR and FORCE_COLOR environment variables.
 * Should be called at application startup before any chalk usage.
 *
 * According to clig.dev guidelines:
 * - NO_COLOR: Disable color output (any value)
 * - FORCE_COLOR: Force color output (any value)
 *
 * Note: Chalk v5 automatically respects NO_COLOR, but we explicitly configure it
 * to ensure FORCE_COLOR is also handled correctly.
 */
export function configureChalk(): void {
  // Chalk v5 automatically respects NO_COLOR, but we can configure FORCE_COLOR
  // by ensuring the environment variable is set properly
  // The actual color disabling is handled by chalk internally when NO_COLOR is set
  // We don't need to do anything special - chalk v5 handles NO_COLOR automatically
  // and FORCE_COLOR is also respected by chalk's internal detection
  // This function exists for documentation and future extensibility
}

export { getVerboseMode, isDebugEnabled, resolveSpinnerState };

export { normalizeInvestecError };

/**
 * Pages output using the PAGER environment variable or default pager.
 * According to clig.dev guidelines, should check PAGER env var for long output.
 * @param content - Content to page
 * @param options - Options including whether output is piped
 */
export async function pageOutput(
  content: string,
  options: { isPiped?: boolean } = {}
): Promise<void> {
  // Don't page if output is piped (would interfere with piping)
  if (options.isPiped || isStdoutPiped()) {
    process.stdout.write(content);
    return;
  }

  // For now, just output directly
  // Note: PAGER environment variable is detected but paging not yet fully implemented
  // TODO: Implement actual paging with spawn when terminal supports it
  // This would require detecting terminal height and only paging if content exceeds it
  console.log(content);
}

export { getTerminalDimensions };

/**
 * Gets the temporary directory path, respecting TMPDIR environment variable.
 * According to clig.dev guidelines, should check TMPDIR for temporary files.
 * Node.js os.tmpdir() already respects TMPDIR, so we use it directly.
 *
 * @returns Path to the temporary directory
 *
 * @example
 * ```typescript
 * const tempDir = getTempDir();
 * const tempFile = path.join(tempDir, 'my-temp-file.txt');
 * ```
 */
export function getTempDir(): string {
  // os.tmpdir() automatically respects TMPDIR environment variable
  // Falls back to OS default (/tmp on Unix, %TEMP% on Windows) if not set
  return tmpdir();
}

/**
 * Gets the directory name of the current module.
 * Works in both normal Node.js ESM and when packaged with pkg.
 * When packaged with pkg, templates are bundled in the snapshot and accessible via snapshot paths.
 * @param metaUrl - The import.meta.url from the calling module (defaults to import.meta.url)
 * @returns The directory path of the current module
 */
export function getModuleDirname(metaUrl: string = import.meta.url): string {
  // Normal ESM: use import.meta.url
  const fileUrl = new URL(metaUrl);
  let dirPath = path.dirname(fileUrl.pathname);
  
  // When packaged with pkg, paths may be in snapshot format
  // pkg uses snapshot paths like /snapshot/project/...
  // We need to normalize the path for both cases
  if (dirPath.startsWith('/snapshot/')) {
    // In pkg snapshot, paths are relative to the snapshot root
    // Return the snapshot path as-is since templates are bundled there
    return dirPath;
  }
  
  // Normal Node.js path
  return dirPath;
}

/**
 * Opens a file in the user's editor, respecting the EDITOR environment variable.
 * According to clig.dev guidelines, should check EDITOR when prompting for multi-line input.
 *
 * @param filepath - Path to the file to open
 * @param options - Options including editor override
 * @throws {CliError} When editor is not available or file cannot be opened
 *
 * @example
 * ```typescript
 * await openInEditor('/path/to/file.json');
 * // Uses $EDITOR or defaults to sensible defaults
 * ```
 */
export async function openInEditor(
  filepath: string,
  options: { editor?: string } = {}
): Promise<void> {
  // Check for editor in options, then environment variable, then defaults
  const editor = options.editor || process.env.EDITOR || getDefaultEditor();

  if (!editor) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'No editor available. Set EDITOR environment variable (e.g., export EDITOR=nano)'
    );
  }

  // Ensure file exists or create it
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Split editor command (handles "editor --flag" format)
  const editorParts = editor.split(/\s+/);
  const editorCommand = editorParts[0];
  const editorArgs = [...editorParts.slice(1), filepath];

  // Ensure editor command is not undefined
  if (!editorCommand) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'Invalid editor command. Set EDITOR environment variable to a valid editor.'
    );
  }

  return new Promise<void>((resolve, reject) => {
    const editorProcess = spawn(editorCommand, editorArgs, {
      stdio: 'inherit',
    });

    editorProcess.on('error', (error: Error) => {
      reject(
        new CliError(
          ERROR_CODES.FILE_NOT_FOUND,
          `Failed to open editor "${editorCommand}": ${error.message}. Set EDITOR environment variable to a valid editor.`
        )
      );
    });

    editorProcess.on('exit', (code: number | null) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(
          new CliError(
            ERROR_CODES.FILE_NOT_FOUND,
            `Editor "${editorCommand}" exited with code ${code}`
          )
        );
      }
    });
  });
}

/**
 * Gets the default editor based on the platform.
 * @returns Default editor command or null if none available
 */
function getDefaultEditor(): string | null {
  // Platform-specific defaults
  if (process.platform === 'win32') {
    // Windows: try common editors
    return 'notepad.exe';
  }

  // Unix-like: try common editors in order of preference
  // These are typically available on most systems
  const unixEditors = ['nano', 'vim', 'vi', 'emacs'];
  // Note: We can't actually check if they're available without spawning
  // So we'll just return the first one and let spawn handle the error
  return unixEditors[0] || null;
}

export {
  detectTerminalCapabilities,
  getSafeText,
  getTerminalCapabilities,
  isStdinPiped,
  isStdoutPiped,
  readStdin,
  safeLog,
};

/**
 * Secret fields that should not be read from environment variables for security reasons.
 * According to clig.dev guidelines, secrets should be stored in credential files, not environment variables.
 */
const SECRET_ENV_VARS = [
  'INVESTEC_CLIENT_SECRET',
  'INVESTEC_API_KEY',
  'INVESTEC_CARD_KEY',
  'OPENAI_API_KEY',
  'SANDBOX_KEY',
] as const;

/**
 * Detects if secrets are being loaded from environment variables.
 * Returns information about which secrets are being loaded from env vars.
 *
 * @returns Object containing information about secret usage from environment variables
 */
export function detectSecretUsageFromEnv(): {
  secretsFromEnv: string[];
  hasSecretsFromEnv: boolean;
} {
  const secretsFromEnv: string[] = [];

  for (const envVar of SECRET_ENV_VARS) {
    if (process.env[envVar] !== undefined && process.env[envVar] !== '') {
      secretsFromEnv.push(envVar);
    }
  }

  return {
    secretsFromEnv,
    hasSecretsFromEnv: secretsFromEnv.length > 0,
  };
}

/**
 * Checks if the CLI is running in a non-interactive environment (script, CI/CD, etc.).
 * This helps determine when to show security warnings.
 *
 * @returns True if running in a non-interactive environment
 */
export function isNonInteractiveEnvironment(): boolean {
  // Check if stdout is not a TTY (piped or redirected)
  if (!process.stdout.isTTY) {
    return true;
  }

  // Check for common CI/CD environment variables
  const ciEnvVars = [
    'CI',
    'CONTINUOUS_INTEGRATION',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'JENKINS_URL',
    'TRAVIS',
    'CIRCLECI',
    'BUILDKITE',
    'TEAMCITY_VERSION',
  ];

  for (const envVar of ciEnvVars) {
    if (process.env[envVar] !== undefined && process.env[envVar] !== '') {
      return true;
    }
  }

  // Check if running in a script (non-interactive shell)
  // This is a heuristic - scripts often have TERM=dumb or no TERM
  const term = process.env.TERM;
  if (term === 'dumb' || term === undefined) {
    // But only if we're not in a TTY (already checked above)
    // This case is mainly for when TERM is set but we're actually in a script
    return false; // We already checked isTTY above
  }

  return false;
}

/**
 * Warns about secret usage from environment variables.
 * According to clig.dev guidelines, secrets should not be read from environment variables
 * because they can be leaked in process lists, logs, or CI/CD configurations.
 *
 * @param options - Options including verbose mode and whether to show warnings
 * @returns True if warnings were shown
 */
export function warnAboutSecretUsage(
  options: { verbose?: boolean; force?: boolean } = {}
): boolean {
  const { secretsFromEnv, hasSecretsFromEnv } = detectSecretUsageFromEnv();

  if (!hasSecretsFromEnv) {
    return false;
  }

  // Only warn in verbose mode or if forced, or if in non-interactive environment
  const shouldWarn =
    options.force || options.verbose || isDebugEnabled() || isNonInteractiveEnvironment();

  if (!shouldWarn) {
    return false;
  }

  const warningText = getSafeText(
    `⚠️  Security Warning: Secrets are being loaded from environment variables:`
  );
  console.warn(chalk.yellow(warningText));

  for (const envVar of secretsFromEnv) {
    console.warn(chalk.yellow(`   - ${envVar}`));
  }

  console.warn(
    chalk.yellow('\n   For better security, store secrets in credential files instead:')
  );
  console.warn(
    chalk.yellow('   - Run: ipb config --client-id <id> --client-secret <secret> --api-key <key>')
  );
  console.warn(
    chalk.yellow(
      '   - Or use profiles: ipb config --profile <name> --client-id <id> --client-secret <secret> --api-key <key>'
    )
  );
  console.warn(chalk.yellow('\n   Environment variables can be leaked in:'));
  console.warn(chalk.yellow('   - Process lists (ps, top)'));
  console.warn(chalk.yellow('   - System logs'));
  console.warn(chalk.yellow('   - CI/CD configuration files'));
  console.warn(chalk.yellow('   - Shell history'));
  console.warn('');

  return true;
}

// Configure chalk at module load time
configureChalk();

/**
 * Determines the appropriate exit code based on error type.
 * @param error - The error to analyze
 * @param errorCode - Optional error code from CliError
 * @param errorMessage - The error message
 * @returns Exit code from ExitCode enum
 */
function determineExitCode(
  _error: unknown,
  errorCode: string | undefined,
  _errorMessage: string
): ExitCode {
  const lowerMessage = _errorMessage.toLowerCase();

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
    (lowerMessage.includes('received undefined') && lowerMessage.includes('path'))
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
    suggestion =
      '\n💡 Tip: Use `ipb cards` to list your cards and get the card key, or provide it with `-c <card-key>`.';
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
    suggestion =
      '\n💡 Tip: Run `ipb config` to set your credentials, or check your API keys in the Investec Developer Portal.';
  }
  // Missing env file errors
  else if (
    errorCode === ERROR_CODES.MISSING_ENV_FILE ||
    lowerMessage.includes('env file') ||
    (lowerMessage.includes('.env.') && lowerMessage.includes('does not exist'))
  ) {
    suggestion =
      '\n💡 Tip: Create the environment file (e.g., `.env.production`) or use a different environment name.';
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
    (lowerMessage.includes('project') && lowerMessage.includes('exists'))
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

  const shouldShowDebugDetails = Boolean(options.verbose) || isDebugEnabled();

  // In verbose or debug mode, show rate limit information if available
  if (shouldShowDebugDetails) {
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
// biome-ignore lint/suspicious/noExplicitAny: Generic function wrapper needs flexible typing for command handlers
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
    const isSensitive = sensitiveKeys.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

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
      (arg.includes('key') ||
        arg.includes('token') ||
        arg.includes('secret') ||
        arg.includes('password'))
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
  } catch {
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
export async function checkForUpdates(
  currentVersion: string,
  force = false
): Promise<string | null> {
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
  const warningText = getSafeText(
    `⚠️  New version available: ${latestVersion} (current: ${currentVersion})`
  );
  console.log(chalk.yellow(`\n${warningText}`));
  console.log(chalk.yellow(`   Run: npm install -g investec-ipb@latest\n`));
}

export { formatOutput, printTable, runListCommand, runReadUploadCommand, runWriteCommand };
export type { OutputOptions, TableData, TableRow };
export { formatFileSize, getFileSize };
export { initializeApi, initializePbApi, normalizeCardKey, validateCredentialsFile };


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
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File path is required and cannot be empty.');
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
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File path is required and cannot be empty.');
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

/**
 * Writes a file atomically using a temporary file and rename.
 * This ensures the file is either completely written or not written at all,
 * preventing corruption from crashes or interruptions.
 *
 * Note: The temporary file is created in the same directory as the target file
 * (not in the system temp directory) because atomic rename operations only work
 * on the same filesystem. This is the correct approach for atomic file writes.
 *
 * For general temporary files that don't require atomic operations, use `getTempDir()`
 * which respects the TMPDIR environment variable.
 *
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
  // Note: Temp file is in same directory as target (required for atomic rename)
  // For general temp files, use getTempDir() instead
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
export async function writeProfile(
  profileName: string,
  data: Record<string, string>
): Promise<void> {
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
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, `Profile "${profileName}" does not exist.`);
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
export async function loadProfile(
  credentials: Credentials,
  profileName?: string
): Promise<Credentials> {
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
    if (retryAfterMatch?.[1]) {
      const retryValue = parseInt(retryAfterMatch[1], 10);
      if (!Number.isNaN(retryValue)) {
        info.retryAfter = retryValue;
      }
    }

    // Try to extract reset time from error message
    const resetMatch = errorMessage.match(/reset[:\s]+(\d+)/i);
    if (resetMatch?.[1]) {
      const resetValue = parseInt(resetMatch[1], 10);
      if (!Number.isNaN(resetValue)) {
        info.reset = resetValue;
      }
    }

    // Check if error object has response/headers (common in fetch responses)
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (
        error as { response?: { status?: number; headers?: Headers | Record<string, string> } }
      ).response;
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
        const rateLimitRemaining =
          getHeader('x-ratelimit-remaining') || getHeader('ratelimit-remaining');
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
  const exponentialDelay = Math.min(baseDelay * 2 ** attempt, maxDelay);
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
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 60000, verbose = false, onRetry } = options;

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
          const warningText = getSafeText(
            `⚠️  Rate limit exceeded. ${formatRateLimitInfo(rateLimitInfo)}. Retrying in ${Math.ceil(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries + 1})`
          );
          console.log(chalk.yellow(warningText));
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


export { createSpinner, stopSpinner, withSpinner, withSpinnerOutcome };
export type { Spinner };

