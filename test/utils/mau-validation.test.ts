/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import {
  validateDateRange,
  validateIsoDate,
  validateMauAccountId,
  validateMauCredentials,
} from '../../src/utils';

describe('MAU validation helpers', () => {
  it('validateMauAccountId accepts numeric ids', () => {
    expect(validateMauAccountId('5331')).toBe('5331');
  });

  it('validateMauAccountId rejects non-numeric ids', () => {
    expect(() => validateMauAccountId('acc-1')).toThrow(CliError);
    expect(() => validateMauAccountId('acc-1')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INVALID_INPUT })
    );
  });

  it('validateIsoDate accepts YYYY-MM-DD', () => {
    expect(validateIsoDate('2024-01-31', '--from')).toBe('2024-01-31');
  });

  it('validateDateRange requires from and to', () => {
    expect(() => validateDateRange(undefined, '2024-01-31')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.MISSING_DATE_RANGE })
    );
    expect(() => validateDateRange('2024-01-01', undefined)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.MISSING_DATE_RANGE })
    );
  });

  it('validateDateRange rejects inverted ranges', () => {
    expect(() => validateDateRange('2024-02-01', '2024-01-01')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.MISSING_DATE_RANGE })
    );
  });

  it('validateMauCredentials requires mau trio', () => {
    expect(() =>
      validateMauCredentials({
        mauClientId: '',
        mauClientSecret: 's',
        mauApiKey: 'k',
      })
    ).toThrow(expect.objectContaining({ code: ERROR_CODES.INVALID_CREDENTIALS }));

    expect(() =>
      validateMauCredentials({
        mauClientId: 'id',
        mauClientSecret: 's',
        mauApiKey: 'k',
      })
    ).not.toThrow();
  });
});
