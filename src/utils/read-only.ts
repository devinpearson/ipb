import type { BasicOptions, Credentials } from '../cmds/types.js';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials as baseCredentials, optionCredentials } from '../runtime-credentials.js';
import { isReadOnlyFromEnv } from './runtime-flags.js';

/** PB API methods that move money. */
export const PB_WRITE_METHODS = ['payMultiple', 'transferMultiple'] as const;

/** Card API methods that change what runs on a card. */
export const CARD_WRITE_METHODS = [
  'uploadCode',
  'uploadPublishedCode',
  'uploadEnv',
  'toggleCode',
] as const;

export function isReadOnlyValue(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * Explains why read-only mode is on, or returns null when it is off.
 */
export function readOnlyReason(creds: Pick<Credentials, 'readOnly'>): string | null {
  if (isReadOnlyFromEnv()) {
    return 'IPB_READ_ONLY is set';
  }
  if (isReadOnlyValue(creds.readOnly)) {
    return 'readOnly is set in your credentials or profile';
  }
  return null;
}

function blockedError(action: string, reason: string): CliError {
  return new CliError(
    ERROR_CODES.READ_ONLY,
    `${action} is blocked because read-only mode is on (${reason}). Read-only mode stops payments, transfers and card code changes. To turn it off, unset IPB_READ_ONLY or run \`ipb config --no-read-only\` in a terminal.`
  );
}

/**
 * Throws READ_ONLY before a command prompts or calls the API, if read-only mode applies.
 * @param action - What is being blocked, e.g. "ipb pay"
 * @param options - Command options (for --profile / --credentials-file resolution)
 */
export async function assertWritable(action: string, options: BasicOptions): Promise<void> {
  const reason =
    readOnlyReason({}) ?? readOnlyReason(await optionCredentials(options, { ...baseCredentials }));
  if (reason) {
    throw blockedError(action, reason);
  }
}

/**
 * Wraps an API client so its write methods throw READ_ONLY. A backstop for any command
 * that forgets {@link assertWritable}.
 */
export function guardWrites<T extends object>(
  api: T,
  methods: readonly string[],
  creds: Pick<Credentials, 'readOnly'>
): T {
  const reason = readOnlyReason(creds);
  if (!reason) {
    return api;
  }
  return new Proxy(api, {
    get(target, property) {
      if (typeof property === 'string' && methods.includes(property)) {
        return () => Promise.reject(blockedError(property, reason));
      }
      const value = Reflect.get(target, property, target);
      // Bind to the real client so methods using #private fields still work through the proxy.
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
