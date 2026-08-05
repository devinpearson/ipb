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

/**
 * Extracts the accounts list from a Mauritius getAccounts response.
 * @param result - Raw getAccounts response
 */
export function extractMauAccounts<T extends object>(result: unknown): T[] {
  if (!result || typeof result !== 'object') {
    return [];
  }
  const data = (result as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object') {
    const accounts =
      (data as { accounts?: unknown; Accounts?: unknown }).accounts ??
      (data as { Accounts?: unknown }).Accounts;
    if (accounts !== undefined) {
      return normalizeToArray<T>(accounts);
    }
  }
  return [];
}

/**
 * Extracts a named list field from `{ data: { [field]: ... } }` responses.
 * @param result - Raw API response
 * @param field - Field name under `data` (e.g. transactions)
 */
export function extractMauDataList<T extends object>(result: unknown, field: string): T[] {
  if (!result || typeof result !== 'object') {
    return [];
  }
  const data = (result as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return normalizeToArray<T>((data as Record<string, unknown>)[field]);
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
