/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import { normalizeCardKey } from '../../src/utils/api.js';

const isCardKeyError = (err: unknown) =>
  err instanceof CliError && err.code === ERROR_CODES.MISSING_CARD_KEY;

describe('normalizeCardKey', () => {
  it('accepts digit-only keys from the option, trimmed, and as numbers', () => {
    expect(normalizeCardKey('1234567', '')).toBe(1234567);
    expect(normalizeCardKey(' 42 ', '')).toBe(42);
    expect(normalizeCardKey(7, '')).toBe(7);
  });

  it('prefers the option over the saved key', () => {
    expect(normalizeCardKey('5', '9')).toBe(5);
  });

  it('falls back to the saved key', () => {
    expect(normalizeCardKey(undefined, ' 9 ')).toBe(9);
  });

  it('requires a key when neither is given', () => {
    expect(() => normalizeCardKey(undefined, '')).toThrow('card-key is required');
    expect(() => normalizeCardKey(undefined, '   ')).toThrow('card-key is required');
  });

  it.each(['abc', '0x10', '1e3', '1.5', '-4', '+4', '0', '', '12 34', '9007199254740993'])(
    'rejects the option value "%s" instead of reading it as another number',
    (input) => {
      expect(() => normalizeCardKey(input, '')).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.MISSING_CARD_KEY,
          message: expect.stringContaining(`Invalid card key: must be a positive whole number`),
        })
      );
    }
  );

  it('rejects non-integer numbers passed directly', () => {
    for (const value of [1.5, -4, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => normalizeCardKey(value, '')).toThrow(CliError);
    }
  });

  it('names the saved key when that is the bad one', () => {
    let thrown: unknown;
    try {
      normalizeCardKey(undefined, '0x10');
    } catch (err) {
      thrown = err;
    }
    expect(isCardKeyError(thrown)).toBe(true);
    expect((thrown as Error).message).toContain(
      'Invalid card key in credentials: must be a positive whole number (digits only), got "0x10". Run `ipb cards`'
    );
  });
});
