/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES, ExitCode } from '../../src/errors.js';
import { determineExitCode } from '../../src/utils/cli-errors.js';

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
});
