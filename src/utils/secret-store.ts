import { CliError, ERROR_CODES } from '../errors.js';
import { deleteKeychainSecret, readKeychainSecret, writeKeychainSecret } from './os-keychain.js';

/** Fields that hold secrets. With `secretStore: "keychain"` these live in the OS keychain, not the file. */
export const SECRET_FIELDS = [
  'clientSecret',
  'apiKey',
  'openaiKey',
  'sandboxKey',
  'mauClientSecret',
  'mauApiKey',
] as const;

/** Value of `secretStore` in a credentials or profile file when its secrets are in the OS keychain. */
export const KEYCHAIN_STORE = 'keychain';

/** Keychain account for the default credentials file or a named profile. */
export function keychainAccount(profileName?: string): string {
  return profileName ? `profile:${profileName}` : 'default';
}

export function usesKeychain(record: Record<string, unknown>): boolean {
  return record.secretStore === KEYCHAIN_STORE;
}

/**
 * Fills in secrets kept in the OS keychain. Records without `secretStore: "keychain"` are returned unchanged.
 */
export function revealSecrets<T extends Record<string, unknown>>(
  record: T,
  account: string,
  { allowMissing = false }: { allowMissing?: boolean } = {}
): T {
  if (!usesKeychain(record)) {
    return record;
  }
  const stored = readKeychainSecret(account);
  if (stored === null) {
    // `ipb config` must still work so the secrets can be entered again.
    if (allowMissing) {
      return record;
    }
    throw new CliError(
      ERROR_CODES.SECRET_STORE_ERROR,
      `Your secrets are set to live in the OS keychain, but there's no "${account}" item there. Run \`ipb config${account === 'default' ? '' : ` --profile ${account.slice('profile:'.length)}`}\` to enter them again.`
    );
  }
  let secrets: Record<string, unknown>;
  try {
    secrets = JSON.parse(stored) as Record<string, unknown>;
  } catch {
    throw new CliError(
      ERROR_CODES.SECRET_STORE_ERROR,
      `The "${account}" keychain item isn't valid ipb data.`
    );
  }
  const revealed: Record<string, unknown> = { ...record };
  for (const field of SECRET_FIELDS) {
    if (typeof secrets[field] === 'string') {
      revealed[field] = secrets[field];
    }
  }
  return revealed as T;
}

/**
 * Prepares a record for writing to disk. With `secretStore: "keychain"` the secrets are saved to the
 * OS keychain and stripped from what is returned; otherwise the record is returned unchanged.
 */
export function storeSecrets(
  record: Record<string, string>,
  account: string
): Record<string, string> {
  if (!usesKeychain(record)) {
    return record;
  }
  const secrets: Record<string, string> = {};
  const rest: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if ((SECRET_FIELDS as readonly string[]).includes(key)) {
      if (value) secrets[key] = value;
    } else {
      rest[key] = value;
    }
  }
  writeKeychainSecret(account, JSON.stringify(secrets));
  return rest;
}

/** Removes a credential set's keychain item, if any. */
export function forgetSecrets(account: string): void {
  deleteKeychainSecret(account);
}
