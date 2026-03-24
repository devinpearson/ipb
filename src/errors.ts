// Custom error class for CLI errors with codes and friendly messages
export class CliError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(`Error (${code}): ${message}`);
    this.code = code;
    this.name = 'CliError';
  }
}

// Exit codes for different error types
// Following Unix conventions: 0 = success, 1-255 = error
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  VALIDATION_ERROR = 2,
  AUTH_ERROR = 3,
  FILE_ERROR = 4,
  API_ERROR = 5,
  NETWORK_ERROR = 6,
  PERMISSION_ERROR = 7,
}

// Example error codes and messages
export const ERROR_CODES = {
  MISSING_API_TOKEN: 'E4002',
  MISSING_CARD_KEY: 'E4003',
  MISSING_ENV_FILE: 'E4004',
  INVALID_CREDENTIALS: 'E4005',
  DEPLOY_FAILED: 'E5001',
  TEMPLATE_NOT_FOUND: 'E4007',
  INVALID_PROJECT_NAME: 'E4008',
  PROJECT_EXISTS: 'E4009',
  FILE_NOT_FOUND: 'E4010',
  MISSING_EMAIL_OR_PASSWORD: 'E4011', // Added for register command
  MISSING_ACCOUNT_ID: 'E4012', // Added for balances command
  INVALID_INPUT: 'E4013', // Added for input validation errors
  RATE_LIMIT_EXCEEDED: 'E4014', // Added for rate limiting errors
  MISSING_CODE_ID: 'E4015', // Added for missing code ID
  INVESTEC_API_ERROR: 'E4016', // Added for Investec API communication failures
  /** File or directory exists but cannot be read or written (e.g. EACCES, EPERM). */
  PERMISSION_DENIED: 'E4017',
  /** Command exists but is intentionally disabled in this build. */
  COMMAND_DISABLED: 'E4018',
  // Add more as needed
};

/**
 * Helper function to throw a custom CLI error.
 * @param code - Error code from ERROR_CODES
 * @param message - Error message
 * @throws {CliError} Always throws a CliError
 */
export function throwCliError(code: string, message: string): never {
  throw new CliError(code, message);
}

/**
 * Helper function to format and print error output.
 * @param error - The error to print (can be any type)
 */
export function printCliError(error: unknown) {
  if (error instanceof CliError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('An unknown error occurred.');
  }
}
