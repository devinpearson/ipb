/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { normalizeSpinnerFlags } from '../../src/utils/spinner-flags.js';

describe('normalizeSpinnerFlags', () => {
  it('passes --no-spinner through unchanged and is not deprecated', () => {
    const input = ['node', 'bin/index.js', 'accounts', '--no-spinner'];
    const result = normalizeSpinnerFlags(input);

    expect(result.argv).toEqual(['node', 'bin/index.js', 'accounts', '--no-spinner']);
    expect(result.usedDeprecatedSpinnerFlag).toBe(false);
  });

  it('maps deprecated -s to --no-spinner', () => {
    const input = ['node', 'bin/index.js', 'accounts', '-s'];
    const result = normalizeSpinnerFlags(input);

    expect(result.argv).toEqual(['node', 'bin/index.js', 'accounts', '--no-spinner']);
    expect(result.usedDeprecatedSpinnerFlag).toBe(true);
  });

  it('does not flag unrelated short options as deprecated', () => {
    const input = ['node', 'bin/index.js', 'accounts', '-v'];
    const result = normalizeSpinnerFlags(input);

    expect(result.argv).toEqual(input);
    expect(result.usedDeprecatedSpinnerFlag).toBe(false);
  });
});
