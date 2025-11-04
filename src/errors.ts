// Custom error class for CLI errors with codes and friendly messages
export class CliError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(`Error (${code}): ${message}`);
    this.code = code;
    this.name = 'CliError';
  }
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
