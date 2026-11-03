/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import {
  defaultMauTransactionDateRange,
  formatLocalIsoDate,
  validateAccountId,
  validateAmount,
  validateDateRange,
  validateIsoDate,
  validateMauAccountId,
} from '../../src/utils/input-validation';

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

  it.each(['0x10', '0b11', '0o7', '1e3', '1E3', '+5', '1,000.00', 'R100', '10 0', 'NaN'])(
    'rejects "%s" instead of reading it as some other number',
    (input) => {
      expect(() => validateAmount(input)).toThrow(/valid number in rands/);
    }
  );

  it('rejects numbers that only stringify in exponent form', () => {
    expect(() => validateAmount(1e-7)).toThrow(/valid number in rands/);
    expect(() => validateAmount('0.0000001')).toThrow(/at most 2 decimal/);
  });

  it('rejects amounts too large to send exactly', () => {
    expect(validateAmount('1000000000000')).toBe(1e12);
    expect(() => validateAmount('1000000000000.01')).toThrow('Amount is too large');
    expect(() => validateAmount('1000000000000000000000')).toThrow('Amount is too large');
  });

  it('accepts plain decimals, including a leading or trailing point', () => {
    expect(validateAmount('.5')).toBe(0.5);
    expect(validateAmount('100.')).toBe(100);
    expect(validateAmount('  7  ')).toBe(7);
  });

  it('counts decimals from what was typed, ignoring trailing zeros', () => {
    expect(validateAmount('1.100')).toBe(1.1);
    expect(validateAmount('5.000000')).toBe(5);
  });

  it('reports negative amounts as not positive rather than malformed', () => {
    expect(() => validateAmount('-0.50')).toThrow('Amount must be positive');
    expect(() => validateAmount('-abc')).toThrow(/valid number in rands/);
  });

  it('words the decimal-places error correctly for singular and plural', () => {
    expect(() => validateAmount('1.23', 1)).toThrow(
      'Amount can have at most 1 decimal place. Found 2 decimal places.'
    );
    expect(() => validateAmount('1.234', 2)).toThrow(
      'Amount can have at most 2 decimal places. Found 3 decimal places.'
    );
    expect(() => validateAmount('1.5', 0)).toThrow(
      'Amount can have at most 0 decimal places. Found 1 decimal place.'
    );
  });
});

describe('validateAccountId', () => {
  it('returns the ID trimmed so callers send it without stray whitespace', () => {
    expect(validateAccountId('  4675778129910189600000003  ')).toBe('4675778129910189600000003');
    expect(validateAccountId('acc_1-x')).toBe('acc_1-x');
  });

  it.each(['', '   '])('rejects an empty ID (%j)', (input) => {
    expect(() => validateAccountId(input)).toThrow('Account ID is required and cannot be empty');
  });

  it('enforces the 3 to 100 character length, measured after trimming', () => {
    expect(() => validateAccountId(' ab ')).toThrow('at least 3 characters');
    expect(validateAccountId('abc')).toBe('abc');
    expect(validateAccountId('a'.repeat(100))).toHaveLength(100);
    expect(() => validateAccountId('a'.repeat(101))).toThrow('cannot exceed 100 characters');
  });

  it.each(['../etc', 'acc/1', 'acc\\1', 'acc?x=1', 'acc#1', 'acc%2F1', 'acc 1', 'acc.1'])(
    'rejects "%s", which could change the request URL',
    (input) => {
      expect(() => validateAccountId(input)).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.INVALID_INPUT,
          message: expect.stringContaining('invalid characters'),
        })
      );
    }
  );
});

describe('validateIsoDate', () => {
  it('returns the trimmed date', () => {
    expect(validateIsoDate(' 2026-10-01 ', '--from')).toBe('2026-10-01');
  });

  it.each(['2026-1-01', '01/10/2026', '2026-10-01T00:00', '20261001', 'x2026-10-01', ''])(
    'rejects the malformed date "%s"',
    (input) => {
      expect(() => validateIsoDate(input, '--to')).toThrow(
        '--to must be a date in YYYY-MM-DD format'
      );
    }
  );

  it.each(['2026-02-31', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-10-00'])(
    'rejects the impossible date %s instead of rolling it over',
    (input) => {
      expect(() => validateIsoDate(input, '--from')).toThrow(
        `--from is not a valid date: ${input}`
      );
    }
  );

  it('accepts real leap days and month ends', () => {
    expect(validateIsoDate('2024-02-29', '--from')).toBe('2024-02-29');
    expect(validateIsoDate('2026-12-31', '--from')).toBe('2026-12-31');
  });
});

describe('validateDateRange', () => {
  it('accepts a single-day range', () => {
    expect(validateDateRange('2026-10-01', '2026-10-01')).toEqual({
      fromDate: '2026-10-01',
      toDate: '2026-10-01',
    });
  });

  it('uses defaults only for the missing end, and treats blank as missing', () => {
    const defaults = { fromDate: '2026-01-01', toDate: '2026-03-31' };
    expect(validateDateRange(undefined, '2026-02-01', defaults)).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
    });
    expect(validateDateRange('2026-02-01', '  ', defaults)).toEqual({
      fromDate: '2026-02-01',
      toDate: '2026-03-31',
    });
    expect(validateDateRange('  ', '2026-02-01', defaults)).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
    });
  });

  it('labels an invalid date with the option it came from', () => {
    expect(() => validateDateRange('2026-02-30', '2026-03-01')).toThrow(
      '--from is not a valid date: 2026-02-30'
    );
    expect(() => validateDateRange('2026-03-01', '2026-04-31')).toThrow(
      '--to is not a valid date: 2026-04-31'
    );
  });

  it('names the missing end', () => {
    expect(() => validateDateRange(undefined, '2026-01-01')).toThrow(
      'Start date is required. Provide --from YYYY-MM-DD'
    );
    expect(() => validateDateRange('2026-01-01', undefined)).toThrow(
      'End date is required. Provide --to YYYY-MM-DD'
    );
  });

  it('rejects a reversed range with both dates in the message', () => {
    expect(() => validateDateRange('2026-02-02', '2026-02-01')).toThrow(
      '--from (2026-02-02) must be on or before --to (2026-02-01)'
    );
  });
});

describe('date helpers', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(formatLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatLocalIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('defaults MAU transactions to the three months up to today', () => {
    expect(defaultMauTransactionDateRange(new Date(2026, 10, 3, 15, 30))).toEqual({
      fromDate: '2026-08-03',
      toDate: '2026-11-03',
    });
  });
});

describe('validateMauAccountId', () => {
  it('returns trimmed numeric IDs and rejects anything else', () => {
    expect(validateMauAccountId(' 5331 ')).toBe('5331');
    expect(() => validateMauAccountId('')).toThrow('Account ID is required and cannot be empty');
    expect(() => validateMauAccountId('   ')).toThrow('Account ID is required');
    expect(() => validateMauAccountId('53a1')).toThrow('MAU account ID must be a numeric value');
    expect(() => validateMauAccountId('-5331')).toThrow('must be a numeric value');
  });
});
