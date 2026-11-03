import chalk from 'chalk';
import { CommanderError } from 'commander';
import { CliError, ERROR_CODES, ExitCode } from '../errors.js';
import { detectRateLimit, formatRateLimitInfo } from './retry.js';
import { isDebugEnabled } from './runtime-flags.js';

/** Word boundaries stop CLI codes like `E4013` or amounts like `R1500` matching as HTTP statuses. */
const HTTP_AUTH_STATUS = /\b40[13]\b/;
const HTTP_SERVER_STATUS = /\b50[0234]\b/;
const HTTP_RATE_LIMIT_STATUS = /\b429\b/;

/** Stable exit mapping for {@link CliError} codes (avoids matching `E4016` as HTTP 401 in heuristics). */
const EXIT_CODE_BY_CLI_CODE: Record<string, ExitCode> = {
  [ERROR_CODES.MISSING_API_TOKEN]: ExitCode.AUTH_ERROR,
  [ERROR_CODES.MISSING_CARD_KEY]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.MISSING_ENV_FILE]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.INVALID_CREDENTIALS]: ExitCode.AUTH_ERROR,
  [ERROR_CODES.DEPLOY_FAILED]: ExitCode.API_ERROR,
  [ERROR_CODES.TEMPLATE_NOT_FOUND]: ExitCode.FILE_ERROR,
  [ERROR_CODES.INVALID_PROJECT_NAME]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.PROJECT_EXISTS]: ExitCode.FILE_ERROR,
  [ERROR_CODES.FILE_NOT_FOUND]: ExitCode.FILE_ERROR,
  [ERROR_CODES.MISSING_EMAIL_OR_PASSWORD]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.MISSING_ACCOUNT_ID]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.INVALID_INPUT]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: ExitCode.API_ERROR,
  [ERROR_CODES.MISSING_CODE_ID]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.INVESTEC_API_ERROR]: ExitCode.API_ERROR,
  [ERROR_CODES.PERMISSION_DENIED]: ExitCode.PERMISSION_ERROR,
  [ERROR_CODES.COMMAND_DISABLED]: ExitCode.GENERAL_ERROR,
  [ERROR_CODES.UNSUPPORTED_OPERATION]: ExitCode.GENERAL_ERROR,
  [ERROR_CODES.MISSING_DATE_RANGE]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.PAYMENT_NOT_CONFIRMED]: ExitCode.API_ERROR,
  [ERROR_CODES.READ_ONLY]: ExitCode.PERMISSION_ERROR,
  [ERROR_CODES.SECRET_STORE_ERROR]: ExitCode.AUTH_ERROR,
};

export function determineExitCode(
  _error: unknown,
  errorCode: string | undefined,
  _errorMessage: string
): ExitCode {
  if (errorCode && EXIT_CODE_BY_CLI_CODE[errorCode] !== undefined) {
    return EXIT_CODE_BY_CLI_CODE[errorCode];
  }

  const lowerMessage = _errorMessage.toLowerCase();

  if (lowerMessage.includes('received undefined')) {
    return ExitCode.VALIDATION_ERROR;
  }

  if (
    lowerMessage.includes('credentials') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    HTTP_AUTH_STATUS.test(lowerMessage) ||
    lowerMessage.includes('invalid token')
  ) {
    return ExitCode.AUTH_ERROR;
  }

  if (
    lowerMessage.includes('file does not exist') ||
    lowerMessage.includes('enoent') ||
    lowerMessage.includes('no such file or directory')
  ) {
    return ExitCode.FILE_ERROR;
  }

  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('eacces') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('eperm')
  ) {
    return ExitCode.PERMISSION_ERROR;
  }

  if (
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed')
  ) {
    return ExitCode.NETWORK_ERROR;
  }

  if (HTTP_SERVER_STATUS.test(lowerMessage)) {
    return ExitCode.API_ERROR;
  }

  return ExitCode.GENERAL_ERROR;
}

/** Shape printed on stderr for failures when JSON errors are on (`--json` or IPB_JSON_ERRORS). */
interface JsonError {
  error: {
    /** CLI error code such as "E4013", or null for usage and unexpected errors. */
    code: string | null;
    /** Name of the code, such as "INVALID_INPUT", or "USAGE_ERROR" for bad arguments. */
    name: string | null;
    message: string;
    exitCode: ExitCode;
    command: string;
    hint: string | null;
  };
}

const CLI_ERROR_PREFIX = /^Error \(E\d+\): /;

function errorCodeName(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return Object.entries(ERROR_CODES).find(([, value]) => value === code)?.[0] ?? null;
}

function handleCommanderError(error: CommanderError, options: { json?: boolean }, context: string) {
  // Help and --version also arrive here when exitOverride is on.
  if (error.exitCode === 0) {
    process.exit(0);
    return;
  }
  const payload: JsonError = {
    error: {
      code: null,
      name: 'USAGE_ERROR',
      message: error.message.replace(/^error: /, ''),
      exitCode: ExitCode.VALIDATION_ERROR,
      command: context,
      hint: 'Run the command with --help to see its arguments and options.',
    },
  };
  if (options.json) {
    console.error(JSON.stringify(payload));
  } else {
    console.error(error.message);
  }
  process.exit(ExitCode.VALIDATION_ERROR);
}

export function handleCliError(
  error: unknown,
  options: { verbose?: boolean; json?: boolean },
  context: string
) {
  if (error instanceof CommanderError) {
    handleCommanderError(error, options, context);
    return;
  }
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');

  let errorCode: string | undefined;
  if (error instanceof CliError) {
    errorCode = error.code;
  }

  const exitCode = determineExitCode(error, errorCode, errorMessage);
  let suggestion = '';
  const lowerMessage = errorMessage.toLowerCase();

  if (
    errorCode === ERROR_CODES.FILE_NOT_FOUND ||
    lowerMessage.includes('file does not exist') ||
    lowerMessage.includes('enoent') ||
    lowerMessage.includes('no such file or directory') ||
    (lowerMessage.includes('received undefined') && lowerMessage.includes('path'))
  ) {
    if (lowerMessage.includes('received undefined') && lowerMessage.includes('path')) {
      suggestion =
        '\n💡 Tip: A file path is missing. If the command takes -f or --filename, pass it.';
    } else {
      suggestion = '\n💡 Tip: Check the file path and ensure the file exists.';
    }
  } else if (
    errorCode === ERROR_CODES.MISSING_CARD_KEY ||
    lowerMessage.includes('card key') ||
    lowerMessage.includes('card-key') ||
    lowerMessage.includes('cardkey')
  ) {
    suggestion =
      '\n💡 Tip: Use `ipb cards` to list your cards and get the card key, or provide it with `-c <card-key>`.';
  } else if (
    errorCode === ERROR_CODES.INVALID_CREDENTIALS ||
    errorCode === ERROR_CODES.MISSING_API_TOKEN ||
    lowerMessage.includes('credentials') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    HTTP_AUTH_STATUS.test(lowerMessage) ||
    lowerMessage.includes('invalid token')
  ) {
    suggestion =
      '\n💡 Tip: Run `ipb config` to set your credentials, or check your API keys in the Investec Developer Portal.';
  } else if (
    errorCode === ERROR_CODES.MISSING_ENV_FILE ||
    lowerMessage.includes('env file') ||
    (lowerMessage.includes('.env.') && lowerMessage.includes('does not exist'))
  ) {
    suggestion =
      '\n💡 Tip: Create the environment file (e.g., `.env.production`) or use a different environment name.';
  } else if (
    errorCode === ERROR_CODES.MISSING_ACCOUNT_ID ||
    lowerMessage.includes('account id') ||
    lowerMessage.includes('accountid')
  ) {
    suggestion = '\n💡 Tip: Use `ipb accounts` to list your accounts and get the account ID.';
  } else if (
    errorCode === ERROR_CODES.TEMPLATE_NOT_FOUND ||
    lowerMessage.includes('template does not exist')
  ) {
    suggestion = '\n💡 Tip: Check available templates or verify the template name is correct.';
  } else if (
    errorCode === ERROR_CODES.PROJECT_EXISTS ||
    (lowerMessage.includes('project') && lowerMessage.includes('exists'))
  ) {
    suggestion = '\n💡 Tip: Use a different project name or remove the existing project directory.';
  } else if (
    errorCode === ERROR_CODES.RATE_LIMIT_EXCEEDED ||
    lowerMessage.includes('rate limit') ||
    HTTP_RATE_LIMIT_STATUS.test(lowerMessage) ||
    lowerMessage.includes('too many requests')
  ) {
    const rateLimitInfo = detectRateLimit(error);
    if (rateLimitInfo) {
      suggestion = `\n💡 Tip: ${formatRateLimitInfo(rateLimitInfo)}. Please wait before retrying.`;
    } else {
      suggestion = '\n💡 Tip: API rate limit exceeded. Please wait a moment before retrying.';
    }
  } else if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('timeout')
  ) {
    suggestion = '\n💡 Tip: Check your internet connection and verify the API host is accessible.';
  } else if (
    errorCode === ERROR_CODES.PERMISSION_DENIED ||
    lowerMessage.includes('permission') ||
    lowerMessage.includes('eacces') ||
    lowerMessage.includes('access denied')
  ) {
    suggestion = '\n💡 Tip: Check file permissions or run with appropriate access rights.';
  }

  if (options.json) {
    const payload: JsonError = {
      error: {
        code: errorCode ?? null,
        name: errorCodeName(errorCode),
        message: errorMessage.replace(CLI_ERROR_PREFIX, ''),
        exitCode,
        command: context,
        hint: suggestion ? suggestion.replace(/^\n💡 Tip: /, '') : null,
      },
    };
    console.error(JSON.stringify(payload));
    process.exit(exitCode);
    return;
  }

  // Everything goes to stderr so a failing `--json` command never adds text to stdout.
  console.error(chalk.redBright(`${context} failed:`), errorMessage);
  if (suggestion) {
    console.error(chalk.yellow(suggestion));
  }

  const shouldShowDebugDetails = Boolean(options.verbose) || isDebugEnabled();
  if (shouldShowDebugDetails) {
    const rateLimitInfo = detectRateLimit(error);
    if (rateLimitInfo) {
      console.error('');
      console.error(chalk.blue('Rate Limit Information:'));
      console.error(chalk.blue(`  ${formatRateLimitInfo(rateLimitInfo)}`));
    }
    console.error('');
    console.error('Error details:', error);
  } else {
    console.error('');
  }

  process.exit(exitCode);
}

/**
 * Wraps an async command handler to attach `commandContext` on errors for `handleCliError`.
 */
export function withCommandContext<A extends readonly unknown[], R>(
  commandName: string,
  handler: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
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
  };
}
