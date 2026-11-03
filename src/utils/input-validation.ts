import { CliError, ERROR_CODES } from '../errors.js';

const PLAIN_DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/;

/** Above this, amounts lose cent precision and stringify in exponent form. */
const MAX_AMOUNT = 1e12;

/**
 * Validates a monetary amount and returns it as a number.
 * Accepts CLI string args (Commander always passes strings) or numbers.
 * @param amount - Amount in rands
 * @param maxDecimals - Maximum allowed fractional digits
 * @returns Parsed finite positive amount
 */
export function validateAmount(amount: number | string, maxDecimals = 2): number {
  if (typeof amount === 'number' && !Number.isFinite(amount)) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be a finite number');
  }

  const text = String(amount).trim();
  if (text.startsWith('-') && PLAIN_DECIMAL.test(text.slice(1))) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be positive');
  }
  // Number() would also accept "0x10", "0b11" and "1e3", silently paying R16, R3 or R1000.
  if (!PLAIN_DECIMAL.test(text)) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      'Amount must be a valid number in rands, written as digits with an optional decimal point (e.g. 100 or 100.50)'
    );
  }

  const value = Number(text);
  if (value <= 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be positive');
  }
  if (value > MAX_AMOUNT) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount is too large');
  }

  // Count from what was typed (ignoring trailing zeros): 1e-7 has no "." in value.toString().
  const decimalPlaces = (text.split('.')[1] ?? '').replace(/0+$/, '').length;
  if (decimalPlaces > maxDecimals) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `Amount can have at most ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'}. Found ${decimalPlaces} decimal place${decimalPlaces === 1 ? '' : 's'}.`
    );
  }

  return value;
}

/**
 * Validates an account ID and returns it trimmed; callers must use the returned value.
 */
export function validateAccountId(accountId: string): string {
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

  // The ID goes into the request URL, so anything beyond these could change the path or query.
  if (!/^[A-Za-z0-9_-]+$/.test(trimmedId)) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      'Account ID contains invalid characters (only letters, digits, "-" and "_" are allowed)'
    );
  }

  return trimmedId;
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
 * Formats a Date as local YYYY-MM-DD.
 * @param date - Date to format
 */
export function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Default MAU transaction window: from = today minus 3 calendar months, to = today.
 */
export function defaultMauTransactionDateRange(now: Date = new Date()): {
  fromDate: string;
  toDate: string;
} {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  from.setMonth(from.getMonth() - 3);
  return {
    fromDate: formatLocalIsoDate(from),
    toDate: formatLocalIsoDate(to),
  };
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

  // JavaScript rolls impossible dates over (2026-02-31 becomes 2026-03-03), so require a round trip.
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new CliError(ERROR_CODES.MISSING_DATE_RANGE, `${label} is not a valid date: ${trimmed}`);
  }

  return trimmed;
}

/**
 * Validates a from/to date range, optionally applying defaults when values are omitted.
 * @param fromDate - Start date option
 * @param toDate - End date option
 * @param defaults - Optional defaults when from/to are missing
 */
export function validateDateRange(
  fromDate: string | undefined,
  toDate: string | undefined,
  defaults?: { fromDate: string; toDate: string }
): { fromDate: string; toDate: string } {
  const resolvedFrom = fromDate?.trim() || defaults?.fromDate;
  const resolvedTo = toDate?.trim() || defaults?.toDate;

  if (!resolvedFrom) {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      'Start date is required. Provide --from YYYY-MM-DD'
    );
  }
  if (!resolvedTo) {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      'End date is required. Provide --to YYYY-MM-DD'
    );
  }

  const from = validateIsoDate(resolvedFrom, '--from');
  const to = validateIsoDate(resolvedTo, '--to');

  if (from > to) {
    throw new CliError(
      ERROR_CODES.MISSING_DATE_RANGE,
      `--from (${from}) must be on or before --to (${to})`
    );
  }

  return { fromDate: from, toDate: to };
}
