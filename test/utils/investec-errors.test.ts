/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import { normalizeInvestecError } from '../../src/utils/investec-errors.js';

describe('normalizeInvestecError', () => {
  it('returns CliError instances unchanged', () => {
    const original = new CliError(ERROR_CODES.INVALID_INPUT, 'handled');
    expect(normalizeInvestecError(original, 'card-api-auth')).toBe(original);
  });

  it('appends string errors to the context message', () => {
    const err = normalizeInvestecError('token expired', 'card-api-auth');
    expect(err.code).toBe(ERROR_CODES.INVESTEC_API_ERROR);
    expect(err.message).toContain('Failed to authenticate with the Investec Card API');
    expect(err.message).toContain('token expired');
  });

  it('uses Error.message when there is no HTTP response', () => {
    const err = normalizeInvestecError(new Error('socket hang up'), 'pb-api-request');
    expect(err.message).toContain('Investec Programmable Banking API request failed');
    expect(err.message).toContain('socket hang up');
  });

  it('reads message from plain object shapes', () => {
    const err = normalizeInvestecError({ message: '  custom  ' }, 'card-api-request');
    expect(err.message).toContain('custom');
  });

  it('serializes object response bodies in the detail', () => {
    const axiosLike = Object.assign(new Error('fail'), {
      response: {
        status: 422,
        statusText: 'Unprocessable Entity',
        data: { reason: 'invalid_payload' },
      },
    });
    const err = normalizeInvestecError(axiosLike, 'pb-api-request');
    expect(err.message).toContain('422');
    expect(err.message).toContain('invalid_payload');
  });

  it('uses only the base message when no detail can be extracted', () => {
    expect(normalizeInvestecError(null, 'card-api-request').message).toContain(
      'Investec Card API request failed'
    );
    expect(normalizeInvestecError(undefined, 'pb-api-auth').message).toContain(
      'Failed to authenticate with the Investec Programmable Banking API'
    );
    expect(normalizeInvestecError({ foo: 1 }, 'card-api-auth').message).toContain(
      'Failed to authenticate with the Investec Card API'
    );
    expect(normalizeInvestecError(null, 'card-api-request').message).toContain('E4016');
  });
});
