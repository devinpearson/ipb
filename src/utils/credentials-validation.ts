import type { Credentials } from '../cmds/types.js';
import { CliError, ERROR_CODES } from '../errors.js';

/**
 * Validates that required credential fields are present and non-empty.
 * @param creds - Credentials object to validate
 * @param requiredFields - Required field names
 */
export function validateCredentialsFile(
  creds: Credentials | Record<string, string>,
  requiredFields: string[] = ['clientId', 'clientSecret', 'apiKey']
): void {
  const credsRecord = creds as Record<string, string>;
  const missing = requiredFields.filter(
    (field) =>
      !credsRecord[field] ||
      (typeof credsRecord[field] === 'string' && credsRecord[field].trim() === '')
  );

  if (missing.length > 0) {
    throw new CliError(
      ERROR_CODES.INVALID_CREDENTIALS,
      `Missing required credential fields: ${missing.join(', ')}. Run 'ipb config' to set your credentials.`
    );
  }
}
