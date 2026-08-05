import { CliError, ERROR_CODES } from '../../errors.js';
import { readStdin } from '../../utils.js';

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
