import chalk from 'chalk';
import { CliError, ERROR_CODES } from '../errors.js';
import { getSafeText } from './terminal.js';

export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export function detectRateLimit(error: unknown): RateLimitInfo | null {
  if (!error) {
    return null;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (
    errorMessage.includes('429') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('ratelimit') ||
    lowerMessage.includes('rate-limit')
  ) {
    const info: RateLimitInfo = {};
    const retryAfterMatch = errorMessage.match(/retry[-\s]after[:\s]+(\d+)/i);
    if (retryAfterMatch?.[1]) {
      const retryValue = parseInt(retryAfterMatch[1], 10);
      if (!Number.isNaN(retryValue)) {
        info.retryAfter = retryValue;
      }
    }

    const resetMatch = errorMessage.match(/reset[:\s]+(\d+)/i);
    if (resetMatch?.[1]) {
      const resetValue = parseInt(resetMatch[1], 10);
      if (!Number.isNaN(resetValue)) {
        info.reset = resetValue;
      }
    }

    if (error && typeof error === 'object' && 'response' in error) {
      const response = (
        error as { response?: { status?: number; headers?: Headers | Record<string, string> } }
      ).response;
      if (response?.headers) {
        const headers = response.headers;
        const getHeader = (name: string): string | null => {
          if (headers instanceof Headers) {
            return headers.get(name);
          }
          if (typeof headers === 'object' && headers !== null) {
            const headerObj = headers as Record<string, string | undefined>;
            const key = Object.keys(headerObj).find((k) => k.toLowerCase() === name.toLowerCase());
            return key && headerObj[key] ? headerObj[key] : null;
          }
          return null;
        };

        const rateLimitLimit = getHeader('x-ratelimit-limit') || getHeader('ratelimit-limit');
        const rateLimitRemaining =
          getHeader('x-ratelimit-remaining') || getHeader('ratelimit-remaining');
        const rateLimitReset = getHeader('x-ratelimit-reset') || getHeader('ratelimit-reset');
        const retryAfter = getHeader('retry-after');

        if (rateLimitLimit) {
          const limitValue = parseInt(rateLimitLimit, 10);
          if (!Number.isNaN(limitValue)) {
            info.limit = limitValue;
          }
        }
        if (rateLimitRemaining) {
          const remainingValue = parseInt(rateLimitRemaining, 10);
          if (!Number.isNaN(remainingValue)) {
            info.remaining = remainingValue;
          }
        }
        if (rateLimitReset) {
          const resetValue = parseInt(rateLimitReset, 10);
          if (!Number.isNaN(resetValue)) {
            info.reset = resetValue;
          }
        }
        if (retryAfter) {
          const retryValue = parseInt(retryAfter, 10);
          if (!Number.isNaN(retryValue)) {
            info.retryAfter = retryValue;
          }
        }
      }
    }

    return Object.keys(info).length > 0 ? info : { retryAfter: 60 };
  }

  return null;
}

export function formatRateLimitInfo(info: RateLimitInfo): string {
  const parts: string[] = [];

  if (info.limit !== undefined && info.remaining !== undefined) {
    parts.push(`Rate limit: ${info.remaining}/${info.limit} requests remaining`);
  }

  if (info.retryAfter) {
    const minutes = Math.floor(info.retryAfter / 60);
    const seconds = info.retryAfter % 60;
    if (minutes > 0) {
      parts.push(`Retry after: ${minutes}m ${seconds}s`);
    } else {
      parts.push(`Retry after: ${seconds}s`);
    }
  } else if (info.reset) {
    const resetDate = new Date(info.reset * 1000);
    const now = Date.now();
    const waitTime = Math.max(0, Math.ceil((resetDate.getTime() - now) / 1000));
    if (waitTime > 0) {
      const minutes = Math.floor(waitTime / 60);
      const seconds = waitTime % 60;
      if (minutes > 0) {
        parts.push(`Rate limit resets in: ${minutes}m ${seconds}s`);
      } else {
        parts.push(`Rate limit resets in: ${seconds}s`);
      }
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'Rate limit exceeded';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoffDelay(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 60000,
  jitter = true
): number {
  const exponentialDelay = Math.min(baseDelay * 2 ** attempt, maxDelay);
  if (jitter) {
    const jitterAmount = exponentialDelay * 0.25;
    const jitterValue = (Math.random() * 2 - 1) * jitterAmount;
    return Math.max(0, exponentialDelay + jitterValue);
  }
  return exponentialDelay;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    verbose?: boolean;
    onRetry?: (attempt: number, error: unknown, delay: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 60000, verbose = false, onRetry } = options;

  let lastError: unknown;
  let lastRateLimitInfo: RateLimitInfo | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const rateLimitInfo = detectRateLimit(error);
      if (rateLimitInfo && attempt < maxRetries) {
        lastRateLimitInfo = rateLimitInfo;
        const delay = rateLimitInfo.retryAfter
          ? rateLimitInfo.retryAfter * 1000
          : calculateBackoffDelay(attempt, baseDelay, maxDelay);

        if (verbose) {
          const warningText = getSafeText(
            `⚠️  Rate limit exceeded. ${formatRateLimitInfo(rateLimitInfo)}. Retrying in ${Math.ceil(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries + 1})`
          );
          console.log(chalk.yellow(warningText));
        }

        if (onRetry) {
          onRetry(attempt, error, delay);
        }

        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  if (lastRateLimitInfo) {
    throw new CliError(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded after ${maxRetries + 1} attempts. ${formatRateLimitInfo(lastRateLimitInfo)}`
    );
  }

  throw lastError;
}
