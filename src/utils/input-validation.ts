import { CliError, ERROR_CODES } from '../errors.js';

/**
 * Validates a monetary amount and returns it as a number.
 * Accepts CLI string args (Commander always passes strings) or numbers.
 * @param amount - Amount in rands
 * @param maxDecimals - Maximum allowed fractional digits
 * @returns Parsed finite positive amount
 */
export function validateAmount(amount: number | string, maxDecimals = 2): number {
  if (typeof amount === 'string' && amount.trim() === '') {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be a valid number');
  }

  const value = typeof amount === 'string' ? Number(amount.trim()) : Number(amount);

  if (Number.isNaN(value)) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be a valid number');
  }

  if (value <= 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be positive');
  }

  if (!Number.isFinite(value)) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be a finite number');
  }

  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  if (decimalPlaces > maxDecimals) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `Amount can have at most ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'}. Found ${decimalPlaces} decimal place${decimalPlaces === 1 ? '' : 's'}.`
    );
  }

  return value;
}

export function validateAccountId(accountId: string): void {
  if (!accountId || accountId.trim().length === 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID is required and cannot be empty');
  }

  const trimmedId = accountId.trim();

  if (trimmedId.length < 3) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID must be at least 3 characters long');
  }

  if (trimmedId.length > 100) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID cannot exceed 100 characters');
  }

  if (trimmedId.includes('..') || trimmedId.includes('/') || trimmedId.includes('\\')) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID contains invalid characters');
  }
}
