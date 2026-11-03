/// <reference types="vitest" />

import { InvestecApiError as CardApiError } from 'investec-card-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import {
  detectRateLimit,
  formatRateLimitInfo,
  httpStatusOf,
  withRetry,
} from '../../src/utils/retry.js';

function httpError(message: string, status?: number, headers?: Headers | Record<string, string>) {
  return Object.assign(new Error(message), { response: { status, headers } });
}

/** An error detected as rate-limited but with no retry-after, so backoff is used. */
const backoffError = () => httpError('rate limit', 429, { 'x-ratelimit-limit': '10' });

describe('detectRateLimit', () => {
  it('returns null for missing or unrelated errors', () => {
    expect(detectRateLimit(undefined)).toBeNull();
    expect(detectRateLimit(new Error('Insufficient funds'))).toBeNull();
    expect(detectRateLimit(httpError('Server error', 500))).toBeNull();
  });

  it('does not mistake 429 inside a longer number for HTTP 429', () => {
    expect(detectRateLimit(new Error('Payment of R14290 failed'))).toBeNull();
    expect(detectRateLimit(new Error('Account 4290001 is closed'))).toBeNull();
  });

  it('detects HTTP 429 from the status or a standalone 429 in the message', () => {
    expect(detectRateLimit(httpError('Request failed', 429))).not.toBeNull();
    expect(detectRateLimit(new Error('Request failed with status code 429'))).not.toBeNull();
    expect(detectRateLimit('429')).not.toBeNull();
  });

  it('detects HTTP 429 from the status on an Investec client error', () => {
    expect(detectRateLimit(new CardApiError('Quota exceeded', 429))).toEqual({ retryAfter: 60 });
    expect(detectRateLimit(new CardApiError('Quota exceeded', 400))).toBeNull();
  });

  it.each(['Rate limit hit', 'Too Many Requests', 'RateLimit reached', 'rate-limit'])(
    'detects the phrase "%s"',
    (message) => {
      expect(detectRateLimit(new Error(message))).not.toBeNull();
    }
  );

  it('defaults to a 60 second wait when the error says nothing more', () => {
    expect(detectRateLimit(new Error('Too many requests'))).toEqual({ retryAfter: 60 });
  });

  it('reads retry-after and reset from the message', () => {
    expect(detectRateLimit(new Error('429 Retry-After: 7'))).toEqual({ retryAfter: 7 });
    expect(detectRateLimit(new Error('rate limit, retry after 12'))).toEqual({ retryAfter: 12 });
    expect(detectRateLimit(new Error('rate limit reset: 1700000000'))).toEqual({
      reset: 1700000000,
    });
  });

  it('reads x-ratelimit-* and retry-after from a plain header object, case-insensitively', () => {
    const info = detectRateLimit(
      httpError('rate limit', 429, {
        'X-RateLimit-Limit': '100',
        'x-ratelimit-remaining': '0',
        'X-RATELIMIT-RESET': '1700000000',
        'Retry-After': '30',
      })
    );
    expect(info).toEqual({ limit: 100, remaining: 0, reset: 1700000000, retryAfter: 30 });
  });

  it('falls back to the unprefixed ratelimit-* headers', () => {
    const info = detectRateLimit(
      httpError('rate limit', 429, {
        'ratelimit-limit': '50',
        'ratelimit-remaining': '5',
        'ratelimit-reset': '1700000001',
      })
    );
    expect(info).toEqual({ limit: 50, remaining: 5, reset: 1700000001 });
  });

  it('reads headers from a fetch Headers object', () => {
    const headers = new Headers({ 'x-ratelimit-limit': '10', 'retry-after': '4' });
    expect(detectRateLimit(httpError('rate limit', 429, headers))).toEqual({
      limit: 10,
      retryAfter: 4,
    });
  });

  it('lets the retry-after header override the message value', () => {
    const info = detectRateLimit(httpError('429 retry-after: 7', 429, { 'retry-after': '9' }));
    expect(info?.retryAfter).toBe(9);
  });

  it('ignores non-numeric header values', () => {
    const info = detectRateLimit(
      httpError('rate limit', 429, {
        'x-ratelimit-limit': 'lots',
        'x-ratelimit-remaining': '',
        'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT',
      })
    );
    expect(info).toEqual({ retryAfter: 60 });
  });
});

describe('httpStatusOf', () => {
  it('reads status, then response.status, and ignores anything that is not a number', () => {
    expect(httpStatusOf(new CardApiError('x', 401))).toBe(401);
    expect(httpStatusOf(httpError('x', 503))).toBe(503);
    expect(
      httpStatusOf(Object.assign(new Error('x'), { status: 401, response: { status: 503 } }))
    ).toBe(401);
    expect(httpStatusOf(Object.assign(new Error('x'), { status: '401' }))).toBeUndefined();
    expect(httpStatusOf(httpError('x'))).toBeUndefined();
    expect(httpStatusOf(new Error('x'))).toBeUndefined();
    expect(httpStatusOf(null)).toBeUndefined();
    expect(httpStatusOf('429')).toBeUndefined();
  });
});

describe('formatRateLimitInfo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to a generic message when there are no details', () => {
    expect(formatRateLimitInfo({})).toBe('Rate limit exceeded');
  });

  it('shows remaining/limit only when both are known', () => {
    expect(formatRateLimitInfo({ limit: 100, remaining: 3 })).toBe(
      'Rate limit: 3/100 requests remaining'
    );
    expect(formatRateLimitInfo({ limit: 100 })).toBe('Rate limit exceeded');
    expect(formatRateLimitInfo({ remaining: 3 })).toBe('Rate limit exceeded');
  });

  it('formats retry-after in seconds, or minutes and seconds', () => {
    expect(formatRateLimitInfo({ retryAfter: 45 })).toBe('Retry after: 45s');
    expect(formatRateLimitInfo({ retryAfter: 60 })).toBe('Retry after: 1m 0s');
    expect(formatRateLimitInfo({ retryAfter: 125 })).toBe('Retry after: 2m 5s');
  });

  it('formats a future reset time relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
    expect(formatRateLimitInfo({ reset: 1_700_000_030 })).toBe('Rate limit resets in: 30s');
    expect(formatRateLimitInfo({ reset: 1_700_000_150 })).toBe('Rate limit resets in: 2m 30s');
  });

  it('ignores a reset time in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
    expect(formatRateLimitInfo({ reset: 1_699_999_000 })).toBe('Rate limit exceeded');
  });

  it('prefers retry-after over reset and joins parts with commas', () => {
    expect(formatRateLimitInfo({ limit: 10, remaining: 0, retryAfter: 5, reset: 9e9 })).toBe(
      'Rate limit: 0/10 requests remaining, Retry after: 5s'
    );
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // zero jitter
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the result without retrying when the call succeeds', async () => {
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('rethrows other errors immediately without retrying', async () => {
    const error = new Error('Insufficient funds for R14290');
    const fn = vi.fn(async () => {
      throw error;
    });
    await expect(withRetry(fn)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('waits for retry-after seconds before retrying, then succeeds', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(httpError('429', 429, { 'retry-after': '7' }))
      .mockResolvedValueOnce('ok');
    const onRetry = vi.fn();

    const result = withRetry(fn, { onRetry });
    await vi.advanceTimersByTimeAsync(6999);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(0, expect.any(Error), 7000);
  });

  it('backs off exponentially from baseDelay when there is no retry-after', async () => {
    const fn = vi.fn(async () => {
      throw backoffError();
    });
    const onRetry = vi.fn();

    const result = withRetry(fn, { maxRetries: 3, baseDelay: 100, onRetry });
    const settled = expect(result).rejects.toThrow(CliError);
    await vi.runAllTimersAsync();
    await settled;

    expect(onRetry.mock.calls.map((c) => c[2])).toEqual([100, 200, 400]);
  });

  it('caps the backoff at maxDelay', async () => {
    const fn = vi.fn(async () => {
      throw backoffError();
    });
    const onRetry = vi.fn();

    const result = withRetry(fn, { maxRetries: 3, baseDelay: 1000, maxDelay: 1500, onRetry });
    const settled = expect(result).rejects.toThrow(CliError);
    await vi.runAllTimersAsync();
    await settled;

    expect(onRetry.mock.calls.map((c) => c[2])).toEqual([1000, 1500, 1500]);
  });

  it('adds up to ±25% jitter to the backoff', async () => {
    const delays = async (random: number) => {
      vi.spyOn(Math, 'random').mockReturnValue(random);
      const onRetry = vi.fn();
      const result = withRetry(
        async () => {
          throw backoffError();
        },
        { maxRetries: 1, baseDelay: 1000, onRetry }
      );
      const settled = expect(result).rejects.toThrow(CliError);
      await vi.runAllTimersAsync();
      await settled;
      return onRetry.mock.calls[0]?.[2];
    };

    expect(await delays(0)).toBe(750);
    expect(await delays(1)).toBe(1250);
  });

  it('gives up after maxRetries with a RATE_LIMIT_EXCEEDED error', async () => {
    const fn = vi.fn(async () => {
      throw httpError('429', 429, { 'retry-after': '2' });
    });

    const result = withRetry(fn, { maxRetries: 2 });
    const settled = expect(result).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.RATE_LIMIT_EXCEEDED &&
        err.message.includes('Rate limit exceeded after 3 attempts. Retry after: 2s.')
    );
    await vi.runAllTimersAsync();
    await settled;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not repeat itself when the rate-limit error has no details', async () => {
    const fn = vi.fn(async () => {
      throw backoffError();
    });

    const result = withRetry(fn, { maxRetries: 0 });
    await expect(result).rejects.toThrow(/Rate limit exceeded after 1 attempts\.$/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('logs each retry only in verbose mode', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const failingOnce = () =>
      vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(httpError('429', 429, { 'retry-after': '3' }))
        .mockResolvedValueOnce('ok');

    const quiet = withRetry(failingOnce(), { maxRetries: 2 });
    await vi.runAllTimersAsync();
    await quiet;
    expect(logSpy).not.toHaveBeenCalled();

    const loud = withRetry(failingOnce(), { maxRetries: 2, verbose: true });
    await vi.runAllTimersAsync();
    await loud;
    const message = String(logSpy.mock.calls[0]?.[0]);
    expect(message).toContain('Rate limit exceeded. Retry after: 3s. Retrying in 3s...');
    expect(message).toContain('(attempt 1/3)');
  });
});
