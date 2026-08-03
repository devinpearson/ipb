/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import { validateAmount } from '../../src/utils/input-validation';

describe('validateAmount', () => {
  it('accepts numeric amounts', () => {
    expect(validateAmount(100)).toBe(100);
    expect(validateAmount(100.5)).toBe(100.5);
  });

  it('coerces CLI string amounts from Commander', () => {
    expect(validateAmount('100.00')).toBe(100);
    expect(validateAmount('250.75')).toBe(250.75);
    expect(validateAmount(' 12.5 ')).toBe(12.5);
  });

  it('rejects non-numeric strings with INVALID_INPUT', () => {
    expect(() => validateAmount('abc')).toThrow(CliError);
    try {
      validateAmount('abc');
    } catch (err) {
      expect(err).toMatchObject({
        code: ERROR_CODES.INVALID_INPUT,
        message: expect.stringContaining('valid number'),
      });
    }
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(() => validateAmount('')).toThrow(/valid number/);
    expect(() => validateAmount('   ')).toThrow(/valid number/);
  });

  it('rejects non-positive amounts from numbers and strings', () => {
    expect(() => validateAmount(0)).toThrow(/positive/);
    expect(() => validateAmount('0')).toThrow(/positive/);
    expect(() => validateAmount('-10')).toThrow(/positive/);
    expect(() => validateAmount(-1)).toThrow(/positive/);
  });

  it('rejects Infinity (the previous Number.isFinite string false-positive path)', () => {
    expect(() => validateAmount(Number.POSITIVE_INFINITY)).toThrow(/finite number/);
    // Strings that are finite numbers must NOT hit the finite-number error.
    expect(validateAmount('100.00')).toBe(100);
  });

  it('rejects too many decimal places for numbers and strings', () => {
    expect(() => validateAmount('1.234')).toThrow(/at most 2 decimal/);
    expect(() => validateAmount(1.234)).toThrow(/at most 2 decimal/);
  });
});
