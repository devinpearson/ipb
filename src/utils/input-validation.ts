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

/**
 * Validates a Mauritius (MAU) account ID (numeric).
 * @param accountId - Account ID as string
 * @returns Parsed numeric account ID
 */
export function validateMauAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID is required and cannot be empty');
  }

  const trimmedId = accountId.trim();
  if (!/^\d+$/.test(trimmedId)) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      'MAU account ID must be a numeric value (e.g. 5331)'
    );
  }

  return trimmedId;
}

/**
 * Validates a date string in YYYY-MM-DD format.
 * @param date - Date string
 * @param label - Field label for error messages (e.g. --from, --to)
 */
export function validateIsoDate(date: string, label: string): string {
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      `${label} must be a date in YYYY-MM-DD format`
    );
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new CliError(ERROR_CODES.MISSING_DATE_RANGE, `${label} is not a valid date: ${trimmed}`);
  }

  return trimmed;
}

/**
 * Validates a required from/to date range.
 * @param fromDate - Start date option
 * @param toDate - End date option
 */
export function validateDateRange(
  fromDate: string | undefined,
  toDate: string | undefined
): { fromDate: string; toDate: string } {
  if (!fromDate || fromDate.trim() === '') {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      'Start date is required. Provide --from YYYY-MM-DD'
    );
  }
  if (!toDate || toDate.trim() === '') {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      'End date is required. Provide --to YYYY-MM-DD'
    );
  }

  const from = validateIsoDate(fromDate, '--from');
  const to = validateIsoDate(toDate, '--to');

  if (from > to) {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      `--from (${from}) must be on or before --to (${to})`
    );
  }

  return { fromDate: from, toDate: to };
}
