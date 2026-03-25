import chalk from 'chalk';
import { CliError, ERROR_CODES, ExitCode } from '../errors.js';
import { detectRateLimit, formatRateLimitInfo } from './retry.js';
import { isDebugEnabled } from './runtime-flags.js';

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
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.MISSING_CODE_ID]: ExitCode.VALIDATION_ERROR,
  [ERROR_CODES.INVESTEC_API_ERROR]: ExitCode.API_ERROR,
  [ERROR_CODES.PERMISSION_DENIED]: ExitCode.PERMISSION_ERROR,
  [ERROR_CODES.COMMAND_DISABLED]: ExitCode.GENERAL_ERROR,
  [ERROR_CODES.UNSUPPORTED_OPERATION]: ExitCode.GENERAL_ERROR,
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
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
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

  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('504')
  ) {
    return ExitCode.API_ERROR;
  }

  return ExitCode.GENERAL_ERROR;
}

export function handleCliError(error: unknown, options: { verbose?: boolean }, context: string) {
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
      suggestion = '\n💡 Tip: Filename is required. Use -f or --filename to specify the file.';
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
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
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
    lowerMessage.includes('429') ||
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

  console.error(chalk.redBright(`Failed to ${context}:`), errorMessage);
  if (suggestion) {
    console.error(chalk.yellow(suggestion));
  }

  const shouldShowDebugDetails = Boolean(options.verbose) || isDebugEnabled();
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

// biome-ignore lint/suspicious/noExplicitAny: Generic function wrapper needs flexible typing for command handlers
export function withCommandContext<T extends (...args: any[]) => Promise<any>>(
  commandName: string,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
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
  }) as T;
}
