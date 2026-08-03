import { initializeApi, initializePbApi, normalizeCardKey } from './utils/api.js';
import { determineExitCode, handleCliError, withCommandContext } from './utils/cli-errors.js';
import { runListCommand, runReadUploadCommand, runWriteCommand } from './utils/command-runners.js';
import {
  cleanupTempFiles,
  deleteProfile,
  ensureCredentialsDirectory,
  getActiveProfile,
  getActiveProfileConfigPath,
  getProfilePath,
  getProfilesDirectory,
  listProfiles,
  loadCredentialsFile,
  loadProfile,
  readCredentialsFile,
  readCredentialsFileSync,
  readProfile,
  setActiveProfile,
  writeCredentialsFile,
  writeFileAtomic,
  writeProfile,
} from './utils/credentials-store.js';
import { validateCredentialsFile } from './utils/credentials-validation.js';
import { formatFileSize, getFileSize } from './utils/file-size.js';
import {
  checkFilePermissions,
  normalizeFilePath,
  validateFileExtension,
  validateFilePath,
  validateFilePathForWrite,
} from './utils/file-validation.js';
import {
  type CommandHistoryEntry,
  getHistoryFilePath,
  logCommandHistory,
  readCommandHistory,
} from './utils/history.js';
import { validateAccountId, validateAmount } from './utils/input-validation.js';
import {
  confirmDestructiveOperation,
  getModuleDirname,
  getTempDir,
  openInEditor,
  pageOutput,
} from './utils/interaction.js';
import { normalizeInvestecError } from './utils/investec-errors.js';
import {
  formatOutput,
  type OutputOptions,
  printTable,
  type TableData,
  type TableRow,
} from './utils/output.js';
import {
  detectRateLimit,
  formatRateLimitInfo,
  type RateLimitInfo,
  withRetry,
} from './utils/retry.js';
import {
  getVerboseMode,
  isDebugEnabled,
  isMockApisEnabled,
  isUpdateCheckDisabled,
  resolveSpinnerState,
} from './utils/runtime-flags.js';
import {
  detectSecretUsageFromEnv,
  isNonInteractiveEnvironment,
  warnAboutSecretUsage,
} from './utils/security.js';
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
  checkForUpdates,
  checkLatestVersion,
  shouldDisplayUpdateNotification,
  showUpdateNotification,
} from './utils/update.js';

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

export {
  getVerboseMode,
  isDebugEnabled,
  isMockApisEnabled,
  isUpdateCheckDisabled,
  resolveSpinnerState,
};

export { normalizeInvestecError };

/**
 * Pages output using the PAGER environment variable or default pager.
 * According to clig.dev guidelines, should check PAGER env var for long output.
 * @param content - Content to page
 * @param options - Options including whether output is piped
 */
export { pageOutput };

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
export { getTempDir };

/**
 * Gets the directory name of the current module.
 * Works in both normal Node.js ESM and when packaged with pkg.
 * When packaged with pkg, templates are bundled in the snapshot and accessible via snapshot paths.
 * @param metaUrl - The import.meta.url from the calling module (defaults to import.meta.url)
 * @returns The directory path of the current module
 */
export { getModuleDirname };

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
export { openInEditor };

/**
 * Gets the default editor based on the platform.
 * @returns Default editor command or null if none available
 */
// getDefaultEditor moved to utils/interaction.ts

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
export { detectSecretUsageFromEnv, isNonInteractiveEnvironment, warnAboutSecretUsage };

export { determineExitCode, handleCliError, withCommandContext };

export {
  checkForUpdates,
  checkLatestVersion,
  shouldDisplayUpdateNotification,
  showUpdateNotification,
};

export { formatOutput, printTable, runListCommand, runReadUploadCommand, runWriteCommand };
export type { OutputOptions, TableData, TableRow };
export { formatFileSize, getFileSize };
export { initializeApi, initializePbApi, normalizeCardKey, validateCredentialsFile };
export { getHistoryFilePath, logCommandHistory, readCommandHistory };
export type { CommandHistoryEntry };

export {
  checkFilePermissions,
  normalizeFilePath,
  validateFileExtension,
  validateFilePath,
  validateFilePathForWrite,
};

export { validateAccountId, validateAmount };

/**
 * Prompts for user confirmation before executing a destructive operation.
 * @param message - The confirmation message to display
 * @param options - Options including `yes` flag to skip confirmation
 * @returns Promise that resolves to true if confirmed, false otherwise
 */
export { confirmDestructiveOperation };

export {
  cleanupTempFiles,
  deleteProfile,
  ensureCredentialsDirectory,
  getActiveProfile,
  getActiveProfileConfigPath,
  getProfilePath,
  getProfilesDirectory,
  listProfiles,
  loadCredentialsFile,
  loadProfile,
  readCredentialsFile,
  readCredentialsFileSync,
  readProfile,
  setActiveProfile,
  writeCredentialsFile,
  writeFileAtomic,
  writeProfile,
};

export { detectRateLimit, formatRateLimitInfo, withRetry };
export type { RateLimitInfo };

export { createSpinner, stopSpinner, withSpinner, withSpinnerOutcome };
export type { Spinner };
