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
  MISSING_EMAIL_OR_PASSWORD: 'E4011',
  MISSING_ACCOUNT_ID: 'E4012',
  INVALID_INPUT: 'E4013',
  RATE_LIMIT_EXCEEDED: 'E4014',
  MISSING_CODE_ID: 'E4015',
  INVESTEC_API_ERROR: 'E4016',
  /** File or directory exists but cannot be read or written (e.g. EACCES, EPERM). */
  PERMISSION_DENIED: 'E4017',
  /** Command exists but is intentionally disabled in this build. */
  COMMAND_DISABLED: 'E4018',
  /** Client or environment does not support the requested operation (e.g. missing API method). */
  UNSUPPORTED_OPERATION: 'E4019',
  /** Required date range (--from / --to) missing or invalid for MAU commands. */
  MISSING_DATE_RANGE: 'E4020',
  /** Bank response did not confirm a payment or transfer (no reference number returned). */
  PAYMENT_NOT_CONFIRMED: 'E4021',
};
