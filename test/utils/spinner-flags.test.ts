/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { normalizeSpinnerFlags } from '../../src/utils/spinner-flags.js';

describe('normalizeSpinnerFlags', () => {
  it('maps --no-spinner to legacy --spinner behavior', () => {
    const input = ['node', 'bin/index.js', 'accounts', '--no-spinner'];
    const result = normalizeSpinnerFlags(input);

    expect(result.argv).toEqual(['node', 'bin/index.js', 'accounts', '--spinner']);
    expect(result.usedDeprecatedSpinnerFlag).toBe(false);
  });

  it('flags deprecated long spinner option', () => {
    const input = ['node', 'bin/index.js', 'accounts', '--spinner'];
    const result = normalizeSpinnerFlags(input);

    expect(result.argv).toEqual(input);
    expect(result.usedDeprecatedSpinnerFlag).toBe(true);
  });

  it('flags deprecated short spinner option', () => {
    const input = ['node', 'bin/index.js', 'accounts', '-s'];
    const result = normalizeSpinnerFlags(input);

    expect(result.argv).toEqual(input);
    expect(result.usedDeprecatedSpinnerFlag).toBe(true);
  });
});
