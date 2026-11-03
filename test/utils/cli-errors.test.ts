/// <reference types="vitest" />

import { CommanderError } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES, ExitCode } from '../../src/errors.js';
import {
  determineExitCode,
  handleCliError,
  withCommandContext,
} from '../../src/utils/cli-errors.js';

const exitFor = (message: string, code?: string) =>
  determineExitCode(new Error(message), code, message);

describe('determineExitCode', () => {
  it.each([
    [ERROR_CODES.MISSING_API_TOKEN, ExitCode.AUTH_ERROR],
    [ERROR_CODES.MISSING_CARD_KEY, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.MISSING_ENV_FILE, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.INVALID_CREDENTIALS, ExitCode.AUTH_ERROR],
    [ERROR_CODES.DEPLOY_FAILED, ExitCode.API_ERROR],
    [ERROR_CODES.TEMPLATE_NOT_FOUND, ExitCode.FILE_ERROR],
    [ERROR_CODES.INVALID_PROJECT_NAME, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.PROJECT_EXISTS, ExitCode.FILE_ERROR],
    [ERROR_CODES.FILE_NOT_FOUND, ExitCode.FILE_ERROR],
    [ERROR_CODES.MISSING_EMAIL_OR_PASSWORD, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.MISSING_ACCOUNT_ID, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.INVALID_INPUT, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.RATE_LIMIT_EXCEEDED, ExitCode.API_ERROR],
    [ERROR_CODES.MISSING_CODE_ID, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.INVESTEC_API_ERROR, ExitCode.API_ERROR],
    [ERROR_CODES.PERMISSION_DENIED, ExitCode.PERMISSION_ERROR],
    [ERROR_CODES.COMMAND_DISABLED, ExitCode.GENERAL_ERROR],
    [ERROR_CODES.UNSUPPORTED_OPERATION, ExitCode.GENERAL_ERROR],
    [ERROR_CODES.MISSING_DATE_RANGE, ExitCode.VALIDATION_ERROR],
    [ERROR_CODES.PAYMENT_NOT_CONFIRMED, ExitCode.API_ERROR],
  ])('maps %s to exit code %i, ignoring the message', (code, expected) => {
    // The message would otherwise look like a network error; the code must win.
    expect(exitFor('fetch failed', code)).toBe(expected);
  });

  it('has an explicit exit code for every CLI error code', () => {
    // An unmapped code falls back to the message, so "fetch failed" would give NETWORK_ERROR.
    const unmapped = Object.entries(ERROR_CODES).filter(
      ([, code]) => exitFor('fetch failed', code) === ExitCode.NETWORK_ERROR
    );
    expect(unmapped).toEqual([]);
  });

  it('falls back to the message for unknown codes', () => {
    expect(exitFor('ECONNREFUSED 127.0.0.1', 'E9999')).toBe(ExitCode.NETWORK_ERROR);
  });

  it.each([
    ['The "path" argument must be of type string. Received undefined', ExitCode.VALIDATION_ERROR],
    ['Invalid credentials supplied', ExitCode.AUTH_ERROR],
    ['Authentication failed', ExitCode.AUTH_ERROR],
    ['Unauthorized', ExitCode.AUTH_ERROR],
    ['Request failed with status code 401', ExitCode.AUTH_ERROR],
    ['Request failed with status code 403', ExitCode.AUTH_ERROR],
    ['Invalid token', ExitCode.AUTH_ERROR],
    ['File does not exist: main.js', ExitCode.FILE_ERROR],
    ['ENOENT: open main.js', ExitCode.FILE_ERROR],
    ['No such file or directory', ExitCode.FILE_ERROR],
    ['Permission denied', ExitCode.PERMISSION_ERROR],
    ['EACCES: open /etc/x', ExitCode.PERMISSION_ERROR],
    ['Access denied', ExitCode.PERMISSION_ERROR],
    ['EPERM: operation not permitted', ExitCode.PERMISSION_ERROR],
    ['connect ECONNREFUSED 127.0.0.1:443', ExitCode.NETWORK_ERROR],
    ['getaddrinfo ENOTFOUND openapi.investec.com', ExitCode.NETWORK_ERROR],
    ['Request timeout', ExitCode.NETWORK_ERROR],
    ['Network unreachable', ExitCode.NETWORK_ERROR],
    ['fetch failed', ExitCode.NETWORK_ERROR],
    ['Request failed with status code 500', ExitCode.API_ERROR],
    ['Request failed with status code 502', ExitCode.API_ERROR],
    ['Request failed with status code 503', ExitCode.API_ERROR],
    ['Request failed with status code 504', ExitCode.API_ERROR],
    ['Something odd happened', ExitCode.GENERAL_ERROR],
  ])('maps the message "%s" to exit code %i', (message, expected) => {
    expect(exitFor(message)).toBe(expected);
  });

  it('does not treat numbers that merely contain a status code as HTTP statuses', () => {
    expect(exitFor('Payment of R1500 failed')).toBe(ExitCode.GENERAL_ERROR);
    expect(exitFor('Error (E4013): bad input')).toBe(ExitCode.GENERAL_ERROR);
  });
});

describe('handleCliError', () => {
  let errLines: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errLines = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errLines.push(args.map(String).join(' '));
    });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEBUG;
  });

  const run = (error: unknown, options: { verbose?: boolean } = {}) => {
    handleCliError(error, options, 'ipb pay');
    return errLines.join('\n');
  };

  it('reports which command failed, with the message, and exits with the mapped code', () => {
    const output = run(new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be positive'));
    expect(output).toContain('ipb pay failed: Error (E4013): Amount must be positive');
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.VALIDATION_ERROR);
  });

  it('handles non-Error values', () => {
    expect(run('plain string')).toContain('ipb pay failed: plain string');
    errLines = [];
    expect(run(undefined)).toContain('ipb pay failed: Unknown error');
  });

  it('writes nothing to stdout, so failing --json commands keep stdout clean', () => {
    run(new Error('boom'));
    run(new Error('429 too many requests retry-after: 5'), { verbose: true });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it.each([
    [new CliError(ERROR_CODES.FILE_NOT_FOUND, 'x'), 'Check the file path'],
    [new Error('ENOENT: open main.js'), 'Check the file path'],
    [new Error('ENOENT: no such file, open path/to/main.js'), 'Check the file path'],
    [new CliError(ERROR_CODES.FILE_NOT_FOUND, 'received undefined'), 'Check the file path'],
    [new Error('File does not exist'), 'Check the file path'],
    [new Error('No such file or directory'), 'Check the file path'],
    [
      new Error('The "path" argument must be of type string. Received undefined'),
      'Filename is required',
    ],
    [new CliError(ERROR_CODES.MISSING_CARD_KEY, 'x'), 'ipb cards'],
    [new Error('Card key is required'), 'ipb cards'],
    [new Error('missing card-key'), 'ipb cards'],
    [new Error('missing cardKey'), 'ipb cards'],
    [new CliError(ERROR_CODES.INVALID_CREDENTIALS, 'x'), 'ipb config'],
    [new CliError(ERROR_CODES.MISSING_API_TOKEN, 'x'), 'ipb config'],
    [new Error('bad credentials'), 'ipb config'],
    [new Error('Authentication failed'), 'ipb config'],
    [new Error('Unauthorized'), 'ipb config'],
    [new Error('status code 401'), 'ipb config'],
    [new Error('invalid token'), 'ipb config'],
    [new CliError(ERROR_CODES.MISSING_ENV_FILE, 'x'), 'Create the environment file'],
    [new Error('env file missing'), 'Create the environment file'],
    [new Error('.env.prod does not exist'), 'Create the environment file'],
    [new CliError(ERROR_CODES.MISSING_ACCOUNT_ID, 'x'), 'ipb accounts'],
    [new Error('Account ID is required'), 'ipb accounts'],
    [new Error('missing accountId'), 'ipb accounts'],
    [new CliError(ERROR_CODES.TEMPLATE_NOT_FOUND, 'x'), 'available templates'],
    [new Error('Template does not exist'), 'available templates'],
    [new CliError(ERROR_CODES.PROJECT_EXISTS, 'x'), 'different project name'],
    [new Error('Project already exists'), 'different project name'],
    [new CliError(ERROR_CODES.RATE_LIMIT_EXCEEDED, 'slow down'), 'API rate limit exceeded'],
    [new Error('429 retry-after: 5'), 'Retry after: 5s. Please wait before retrying.'],
    [new Error('Too many requests'), 'Please wait before retrying'],
    [new Error('rate limit hit'), 'Please wait before retrying'],
    [new Error('network down'), 'Check your internet connection'],
    [new Error('fetch failed'), 'Check your internet connection'],
    [new Error('connect ECONNREFUSED'), 'Check your internet connection'],
    [new Error('Request timeout'), 'Check your internet connection'],
    [new CliError(ERROR_CODES.PERMISSION_DENIED, 'x'), 'Check file permissions'],
    [new Error('permission denied'), 'Check file permissions'],
    [new Error('EACCES'), 'Check file permissions'],
    [new Error('Access denied'), 'Check file permissions'],
  ])('gives a matching tip for %s', (error, tip) => {
    const tipLine = run(error)
      .split('\n')
      .find((line) => line.includes('💡 Tip:'));
    expect(tipLine).toContain(tip);
  });

  it.each([
    'Received undefined',
    'invalid path',
    '.env.prod is malformed',
    'project name is invalid',
    'already exists',
  ])('needs both keywords before giving a tip: "%s" gets none', (message) => {
    expect(run(new Error(message))).not.toContain('Tip');
  });

  it('prints just the failure line and a blank line when there is no tip', () => {
    run(new Error('boom'));
    expect(errLines).toEqual(['ipb pay failed: boom', '']);
  });

  it('gives no tip for unrecognised errors or numbers that only contain 429', () => {
    expect(run(new Error('boom'))).not.toContain('Tip');
    errLines = [];
    expect(run(new Error('Payment of R14290 failed'))).not.toContain('Tip');
  });

  it('shows error details only in verbose or DEBUG mode', () => {
    expect(run(new Error('boom'))).not.toContain('Error details:');
    errLines = [];
    expect(run(new Error('boom'), { verbose: true })).toContain('Error details:');
    errLines = [];
    process.env.DEBUG = '1';
    expect(run(new Error('boom'))).toContain('Error details:');
  });

  it('adds rate-limit information in verbose mode', () => {
    const output = run(new Error('429 retry-after: 5'), { verbose: true });
    expect(output).toContain('Rate Limit Information:');
    expect(output).toContain('  Retry after: 5s');
    errLines = [];
    expect(run(new Error('boom'), { verbose: true })).not.toContain('Rate Limit Information');
  });
});

describe('withCommandContext', () => {
  it('passes arguments through and returns the result', async () => {
    const handler = vi.fn(async (a: number, b: string) => `${a}${b}`);
    await expect(withCommandContext('pay', handler)(1, 'x')).resolves.toBe('1x');
    expect(handler).toHaveBeenCalledWith(1, 'x');
  });

  it('tags thrown errors with a hidden commandContext and rethrows the same error', async () => {
    const error = new Error('boom');
    const wrapped = withCommandContext('mau balances', async () => {
      throw error;
    });

    await expect(wrapped()).rejects.toBe(error);
    expect((error as Error & { commandContext?: string }).commandContext).toBe('mau balances');
    expect(Object.keys(error)).not.toContain('commandContext');
  });

  it('rethrows non-Error values unchanged', async () => {
    const wrapped = withCommandContext('pay', async () => {
      throw 'plain';
    });
    await expect(wrapped()).rejects.toBe('plain');
  });
});

describe('handleCliError with JSON errors', () => {
  let errLines: string[];
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errLines = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errLines.push(args.map(String).join(' '));
    });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const runJson = (error: unknown, options: { verbose?: boolean } = {}) => {
    handleCliError(error, { ...options, json: true }, 'ipb pay');
    expect(errLines).toHaveLength(1);
    return JSON.parse(errLines[0] as string);
  };

  it('prints exactly one JSON object on stderr with code, name, message, exit code and hint', () => {
    const payload = runJson(
      new CliError(ERROR_CODES.MISSING_ACCOUNT_ID, 'Account ID is required.')
    );
    expect(payload).toEqual({
      error: {
        code: 'E4012',
        name: 'MISSING_ACCOUNT_ID',
        message: 'Account ID is required.',
        exitCode: ExitCode.VALIDATION_ERROR,
        command: 'ipb pay',
        hint: 'Use `ipb accounts` to list your accounts and get the account ID.',
      },
    });
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.VALIDATION_ERROR);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('uses null code, name and hint for an uncoded error without a tip', () => {
    expect(runJson(new Error('boom')).error).toMatchObject({
      code: null,
      name: null,
      message: 'boom',
      exitCode: ExitCode.GENERAL_ERROR,
      hint: null,
    });
  });

  it('reports READ_ONLY with the permission exit code', () => {
    const payload = runJson(new CliError(ERROR_CODES.READ_ONLY, 'ipb pay is blocked'));
    expect(payload.error).toMatchObject({
      code: 'E4022',
      name: 'READ_ONLY',
      exitCode: ExitCode.PERMISSION_ERROR,
    });
  });

  it('gives a null name for an unknown code and only strips a leading code prefix', () => {
    expect(runJson(new CliError('E9999', 'odd')).error).toMatchObject({
      code: 'E9999',
      name: null,
      message: 'odd',
    });
    errLines = [];
    expect(runJson(new Error('Wrapped: Error (E4013): inner')).error.message).toBe(
      'Wrapped: Error (E4013): inner'
    );
  });

  it('stays a single line even in verbose mode', () => {
    runJson(new Error('429 retry-after: 5'), { verbose: true });
  });
});

describe('handleCliError with Commander errors', () => {
  let errLines: string[];
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errLines = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errLines.push(args.map(String).join(' '));
    });
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports usage errors as USAGE_ERROR with exit code 2', () => {
    const error = new CommanderError(1, 'commander.unknownOption', "error: unknown option '--x'");
    handleCliError(error, { json: true }, 'ipb accounts');

    expect(JSON.parse(errLines[0] as string)).toEqual({
      error: {
        code: null,
        name: 'USAGE_ERROR',
        message: "unknown option '--x'",
        exitCode: ExitCode.VALIDATION_ERROR,
        command: 'ipb accounts',
        hint: 'Run the command with --help to see its arguments and options.',
      },
    });
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.VALIDATION_ERROR);
  });

  it('only strips a leading "error: " from usage messages', () => {
    handleCliError(new CommanderError(1, 'x', 'bad value, error: 3'), { json: true }, 'ipb');
    expect(JSON.parse(errLines[0] as string).error.message).toBe('bad value, error: 3');
  });

  it('prints the plain message outside JSON mode', () => {
    const error = new CommanderError(1, 'commander.missingArgument', 'error: missing argument');
    handleCliError(error, {}, 'ipb pay');
    expect(errLines).toEqual(['error: missing argument']);
  });

  it('exits 0 silently for --help and --version', () => {
    handleCliError(
      new CommanderError(0, 'commander.helpDisplayed', '(outputHelp)'),
      { json: true },
      'ipb'
    );
    expect(errLines).toEqual([]);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
