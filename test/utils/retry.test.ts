/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { detectRateLimit, formatRateLimitInfo, withRetry } from '../../src/utils/retry.js';

describe('retry utilities', () => {
  it('detects rate-limit hints from error message', () => {
    const info = detectRateLimit(new Error('429 too many requests retry-after: 7'));
    expect(info).not.toBeNull();
    expect(info?.retryAfter).toBe(7);
  });

  it('formats retry-after info for display', () => {
    expect(formatRateLimitInfo({ retryAfter: 65 })).toContain('1m 5s');
  });

  it('retries and succeeds on subsequent attempt', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('429 rate limit retry-after: 0');
      }
      return 'ok';
    });

    const result = await withRetry(fn, { maxRetries: 2, verbose: false });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rethrows underlying error after max retries are exhausted', async () => {
    const fn = vi.fn(async () => {
      throw new Error('429 too many requests retry-after: 0');
    });

    await expect(withRetry(fn, { maxRetries: 1, verbose: false })).rejects.toThrow(
      '429 too many requests retry-after: 0'
    );
  });
});
