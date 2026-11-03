/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES, ExitCode } from '../../src/errors.js';
import { determineExitCode, handleCliError } from '../../src/utils/cli-errors.js';

describe('determineExitCode', () => {
  it('maps UNSUPPORTED_OPERATION to general error', () => {
    const err = new CliError(ERROR_CODES.UNSUPPORTED_OPERATION, 'not supported');
    expect(determineExitCode(err, err.code, err.message)).toBe(ExitCode.GENERAL_ERROR);
  });

  it('maps INVESTEC_API_ERROR to API error', () => {
    const err = new CliError(ERROR_CODES.INVESTEC_API_ERROR, 'bad response');
    expect(determineExitCode(err, err.code, err.message)).toBe(ExitCode.API_ERROR);
  });

  it('maps INVALID_INPUT to validation error', () => {
    const err = new CliError(ERROR_CODES.INVALID_INPUT, 'bad shell');
    expect(determineExitCode(err, err.code, err.message)).toBe(ExitCode.VALIDATION_ERROR);
  });

  it('maps RATE_LIMIT_EXCEEDED to API error', () => {
    const err = new CliError(ERROR_CODES.RATE_LIMIT_EXCEEDED, 'too many requests');
    expect(determineExitCode(err, err.code, err.message)).toBe(ExitCode.API_ERROR);
  });

  it('maps PAYMENT_NOT_CONFIRMED to API error', () => {
    const err = new CliError(ERROR_CODES.PAYMENT_NOT_CONFIRMED, 'no reference');
    expect(determineExitCode(err, err.code, err.message)).toBe(ExitCode.API_ERROR);
  });

  it('treats a bare HTTP 401 message as an auth error', () => {
    expect(determineExitCode(new Error('x'), undefined, 'Request failed with status 401')).toBe(
      ExitCode.AUTH_ERROR
    );
  });

  it('does not mistake an E4013 code in an uncoded message for HTTP 401', () => {
    expect(determineExitCode(new Error('x'), undefined, 'Error (E4013): bad input')).not.toBe(
      ExitCode.AUTH_ERROR
    );
  });
});

describe('handleCliError suggestions', () => {
  it('does not suggest credentials for an E4013 input error', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    handleCliError(
      new CliError(ERROR_CODES.INVALID_INPUT, 'Beneficiary b9 was not found on your profile.'),
      {},
      'pay command'
    );

    const output = errSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).not.toContain('ipb config');
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
