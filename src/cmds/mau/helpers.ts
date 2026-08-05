import { CliError, ERROR_CODES } from '../../errors.js';
import { readStdin } from '../../utils.js';

/**
 * Coerces API list payloads into a real array.
 * Handles singleton objects (common when APIs serialize one-item lists as objects).
 * @param value - Candidate list value from an API response
 */
export function normalizeToArray<T extends object>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // XML-style wrappers: { account: [...] } / { account: {...} }
    for (const key of ['account', 'transaction', 'documentInformation', 'document']) {
      if (key in record) {
        return normalizeToArray<T>(record[key]);
      }
    }
    return [value as T];
  }
  return [];
}

function readNamedField(source: unknown, field: string): unknown {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (field in record) {
    return record[field];
  }
  const capitalized = field.charAt(0).toUpperCase() + field.slice(1);
  if (capitalized in record) {
    return record[capitalized];
  }
  return undefined;
}

/**
 * Extracts the accounts list from a Mauritius getAccounts response.
 * Supports `{ data: { accounts } }`, top-level `{ accounts }`, and singleton objects.
 * @param result - Raw getAccounts response
 */
export function extractMauAccounts<T extends object>(result: unknown): T[] {
  if (!result || typeof result !== 'object') {
    return [];
  }
  const root = result as { data?: unknown };
  const data = root.data;

  if (Array.isArray(data)) {
    return data as T[];
  }

  const nestedAccounts = readNamedField(data, 'accounts');
  if (nestedAccounts !== undefined) {
    return normalizeToArray<T>(nestedAccounts);
  }

  const topLevelAccounts = readNamedField(result, 'accounts');
  if (topLevelAccounts !== undefined) {
    return normalizeToArray<T>(topLevelAccounts);
  }

  return [];
}

/**
 * Extracts a named list field from MAU list responses.
 * Tries `data[field]`, then top-level `field`.
 * @param result - Raw API response
 * @param field - Field name (e.g. transactions)
 */
export function extractMauDataList<T extends object>(result: unknown, field: string): T[] {
  if (!result || typeof result !== 'object') {
    return [];
  }
  const data = (result as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as T[];
  }

  const nested = readNamedField(data, field);
  if (nested !== undefined) {
    return normalizeToArray<T>(nested);
  }

  const topLevel = readNamedField(result, field);
  if (topLevel !== undefined) {
    return normalizeToArray<T>(topLevel);
  }

  return [];
}

/**
 * Returns true when value looks like a MAU balance record.
 */
function looksLikeBalanceRecord(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ('accountNumber' in value || 'availableBalance' in value || 'accountShortName' in value)
  );
}

/**
 * Extracts a MAU balance record from documented and live response shapes.
 * Live Mauritius balance payloads often look like `{ accounts: { balance: {...} } }`
 * (with or without a `data` wrapper) instead of `{ data: { accountNumber, ... } }`.
 * @param result - Raw getAccountBalances response
 */
export function extractMauBalance<T extends object>(result: unknown): T | undefined {
  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const candidates: unknown[] = [result];
  const data = (result as { data?: unknown }).data;
  if (data !== undefined) {
    candidates.push(data);
  }

  for (const candidate of candidates) {
    if (looksLikeBalanceRecord(candidate)) {
      return candidate as T;
    }

    const accounts = readNamedField(candidate, 'accounts');
    const nestedBalance = readNamedField(accounts, 'balance');
    if (looksLikeBalanceRecord(nestedBalance)) {
      return nestedBalance as T;
    }

    // accounts may itself be the balance object in some payloads
    if (looksLikeBalanceRecord(accounts)) {
      return accounts as T;
    }

    const directBalance = readNamedField(candidate, 'balance');
    if (looksLikeBalanceRecord(directBalance)) {
      return directBalance as T;
    }
  }

  return undefined;
}

/**
 * Extracts a single MAU record (generic) from `{ data: {...} }` or a bare object.
 * Prefer {@link extractMauBalance} for balance endpoints.
 * @param result - Raw API response
 */
export function extractMauRecord<T extends object>(result: unknown): T | undefined {
  return extractMauBalance<T>(result);
}

/**
 * Resolves a MAU account ID from an argument or stdin JSON/plain text.
 * @param accountId - Optional account ID argument
 * @returns Resolved account ID string (may still need validation)
 */
export async function resolveMauAccountId(accountId: string | undefined): Promise<string> {
  let resolved = accountId?.trim() ?? '';

  if (!resolved) {
    const stdinData = await readStdin();
    if (stdinData) {
      try {
        const parsed = JSON.parse(stdinData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          resolved = String(parsed[0].accountId ?? '');
        } else if (parsed && typeof parsed === 'object' && 'accountId' in parsed) {
          resolved = String((parsed as { accountId: unknown }).accountId);
        } else if (typeof parsed === 'string' || typeof parsed === 'number') {
          resolved = String(parsed);
        }
      } catch {
        resolved = stdinData.trim();
      }
    }
  }

  if (!resolved) {
    throw new CliError(
      ERROR_CODES.MISSING_ACCOUNT_ID,
      'Account ID is required. Provide it as an argument or via stdin.'
    );
  }

  return resolved;
}
