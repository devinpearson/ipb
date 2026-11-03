import chalk from 'chalk';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentialLocation } from '../runtime-credentials.js';
import { isKeychainSupported } from '../utils/os-keychain.js';
import { isReadOnlyValue } from '../utils/read-only.js';
import { isReadOnlyFromEnv } from '../utils/runtime-flags.js';
import {
  forgetSecrets,
  KEYCHAIN_STORE,
  keychainAccount,
  SECRET_FIELDS as SECRET_STORE_FIELDS,
  usesKeychain,
} from '../utils/secret-store.js';
import {
  createSpinner,
  deleteProfile,
  ensureCredentialsDirectory,
  getSafeText,
  isStdoutPiped,
  readCredentialsFile,
  readProfile,
  resolveSpinnerState,
  withSpinner,
  writeCredentialsFile,
  writeProfile,
} from '../utils.js';
import {
  finalizeProfileDeletion,
  runConfigProfileList,
  runConfigProfileSet,
  runConfigProfileShow,
} from './config-subcommands.js';

const CONFIG_FIELDS = [
  'host',
  'clientId',
  'clientSecret',
  'apiKey',
  'cardKey',
  'openaiKey',
  'sandboxKey',
  'mauHost',
  'mauClientId',
  'mauClientSecret',
  'mauApiKey',
] as const;

type ConfigField = (typeof CONFIG_FIELDS)[number];

const SECRET_FIELDS: ReadonlySet<ConfigField> = new Set<ConfigField>(SECRET_STORE_FIELDS);

const FLAG_NAMES: Record<ConfigField, string> = {
  host: '--host',
  clientId: '--client-id',
  clientSecret: '--client-secret',
  apiKey: '--api-key',
  cardKey: '--card-key',
  openaiKey: '--openai-key',
  sandboxKey: '--sandbox-key',
  mauHost: '--mau-host',
  mauClientId: '--mau-client-id',
  mauClientSecret: '--mau-client-secret',
  mauApiKey: '--mau-api-key',
};

/** Value that tells an option to read from stdin, e.g. `op read ... | ipb config --client-secret -`. */
const STDIN_VALUE = '-';

type Options = Partial<Record<ConfigField, string>> & {
  profile?: string;
  verbose: boolean;
  spinner?: boolean;
  /** true from --read-only, false from --no-read-only, undefined when neither is passed. */
  readOnly?: boolean;
  /** true from --keychain, false from --no-keychain, undefined when neither is passed. */
  keychain?: boolean;
};

interface ProfileOptions {
  list?: boolean;
  create?: string;
  delete?: string;
  set?: string;
  show?: boolean;
}

async function runWithConfigSpinner<T>(
  options: Options & ProfileOptions,
  text: string,
  operation: () => Promise<T>
): Promise<T> {
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, getSafeText(text));
  return withSpinner(spinner, spinnerEnabled, operation);
}

/**
 * Sets authentication credentials and saves them securely.
 * @param options - CLI options for credentials (API key, client ID, client secret, card key, OpenAI key, sandbox key, optional profile)
 * @throws {Error} When file operations fail
 */
export async function configCommand(options: Options & ProfileOptions) {
  // Handle profile management commands
  if (options.list) {
    await runConfigProfileList();
    return;
  }

  if (options.show) {
    await runConfigProfileShow();
    return;
  }

  if (options.set) {
    await runConfigProfileSet(options.set);
    return;
  }

  if (options.delete) {
    const profileToDelete = options.delete;
    await runWithConfigSpinner(options, 'Removing profile...', () =>
      deleteProfile(profileToDelete)
    );
    await finalizeProfileDeletion(profileToDelete);
    return;
  }

  // Regular config command - save to profile or default credentials
  const profileName = options.profile;
  let existing: Record<string, string>;
  if (profileName) {
    try {
      existing = { ...(await readProfile(profileName, { allowMissingSecrets: true })) };
    } catch (error) {
      // A new profile is fine; anything else (bad JSON, locked keychain) must not be overwritten.
      if (!(error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND)) {
        throw error;
      }
      existing = {};
    }
  } else {
    existing = {
      ...(await readCredentialsFile(credentialLocation, { allowMissingSecrets: true })),
    } as Record<string, string>;
  }

  let updates: Record<string, string> = await readFlagValues(options);
  if (options.readOnly !== undefined) {
    const readOnly = await resolveReadOnlyChange(options.readOnly);
    if (readOnly === null) {
      console.log('Read-only mode left on.');
      return;
    }
    updates = { ...updates, readOnly };
  }
  const movingOutOfKeychain = options.keychain === false && usesKeychain(existing);
  if (options.keychain === true && !usesKeychain(existing)) {
    if (!isKeychainSupported()) {
      throw new CliError(
        ERROR_CODES.UNSUPPORTED_OPERATION,
        `The OS keychain isn't supported on ${process.platform} yet.`
      );
    }
    updates = { ...updates, secretStore: KEYCHAIN_STORE };
  }
  if (Object.keys(updates).length === 0 && !movingOutOfKeychain) {
    if (options.keychain !== undefined) {
      console.log(
        `Secrets are already ${options.keychain ? 'in the OS keychain' : 'in the file'}.`
      );
      return;
    }
    if (!(process.stdin.isTTY && process.stdout.isTTY)) {
      throw new CliError(
        ERROR_CODES.INVALID_INPUT,
        'Nothing to save. Pass options such as --client-id, or run `ipb config` in a terminal to be prompted.'
      );
    }
    updates = await promptForCredentials(existing);
    if (Object.keys(updates).length === 0) {
      console.log('Nothing changed.');
      return;
    }
  }

  const merged: Record<string, string> = { ...existing, ...updates };
  if (movingOutOfKeychain) {
    delete merged.secretStore;
  }
  if (profileName) {
    await runWithConfigSpinner(options, `Saving profile "${profileName}"...`, () =>
      writeProfile(profileName, merged)
    );
    console.log(`🔑 Profile "${profileName}" saved`);
  } else {
    if (Object.values(existing).every((v) => v === '')) {
      await ensureCredentialsDirectory(credentialLocation);
    }
    await runWithConfigSpinner(options, 'Saving credentials...', () =>
      writeCredentialsFile(credentialLocation.filename, merged)
    );
    console.log('🔑 credentials saved');
  }

  if (updates.secretStore === KEYCHAIN_STORE) {
    console.log(
      `🔐 Secrets moved to the OS keychain (item "${keychainAccount(profileName)}"); the file keeps only non-secret settings.`
    );
  } else if (movingOutOfKeychain) {
    // The file now holds the secrets, so the keychain copy can go.
    forgetSecrets(keychainAccount(profileName));
    console.log('Secrets moved back into the credentials file and removed from the OS keychain.');
  }

  if (updates.readOnly === 'true') {
    console.log('🔒 Read-only mode is on: payments, transfers and card code changes are blocked.');
  } else if (updates.readOnly === 'false') {
    const defaults = await readCredentialsFile(credentialLocation);
    if (profileName && isReadOnlyValue(defaults.readOnly)) {
      console.warn(
        chalk.yellow(
          `Read-only mode is still on: it is also set in ${credentialLocation.filename}, which applies to every profile. Run \`ipb config --no-read-only\` without --profile to turn it off there.`
        )
      );
    } else {
      console.log('Read-only mode is off.');
    }
  }
}

/**
 * Returns the value to store for readOnly, or null if the user declined to turn it off.
 * Turning it off needs a person at a terminal, so an agent or script can't do it.
 */
async function resolveReadOnlyChange(readOnly: boolean): Promise<'true' | 'false' | null> {
  if (readOnly) {
    return 'true';
  }
  if (isReadOnlyFromEnv()) {
    throw new CliError(
      ERROR_CODES.READ_ONLY,
      'IPB_READ_ONLY is set in your environment; unset it to leave read-only mode.'
    );
  }
  if (!(process.stdin.isTTY && process.stdout.isTTY)) {
    throw new CliError(
      ERROR_CODES.READ_ONLY,
      'Turning off read-only mode needs an interactive terminal, so a script or agent cannot do it.'
    );
  }
  const { confirm } = await import('@inquirer/prompts');
  const confirmed = await confirm({
    message: 'Turn off read-only mode? Payments, transfers and card code changes will be allowed.',
    default: false,
  });
  return confirmed ? 'false' : null;
}

/**
 * Collects values passed as flags, reading at most one from stdin when its value is `-`.
 */
async function readFlagValues(options: Options): Promise<Partial<Record<ConfigField, string>>> {
  const updates: Partial<Record<ConfigField, string>> = {};
  const fromStdin = CONFIG_FIELDS.filter((field) => options[field] === STDIN_VALUE);

  if (fromStdin.length > 1) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `Only one option can read from stdin (-); got ${fromStdin.map((f) => FLAG_NAMES[f]).join(', ')}.`
    );
  }
  const stdinField = fromStdin[0];
  if (stdinField) {
    updates[stdinField] = await readSecretFromStdin(FLAG_NAMES[stdinField]);
  }

  const literalSecrets: string[] = [];
  for (const field of CONFIG_FIELDS) {
    const value = options[field];
    if (!value || value === STDIN_VALUE) {
      continue;
    }
    updates[field] = value;
    if (SECRET_FIELDS.has(field)) {
      literalSecrets.push(FLAG_NAMES[field]);
    }
  }

  if (literalSecrets.length > 0 && process.stdin.isTTY) {
    console.warn(
      chalk.yellow(
        `Tip: ${literalSecrets.join(', ')} on the command line ends up in your shell history. ` +
          'Run `ipb config` with no options to be prompted, or pipe the value in with `-`.'
      )
    );
  }
  return updates;
}

async function readSecretFromStdin(flagName: string): Promise<string> {
  if (process.stdin.isTTY) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `${flagName} - reads the value from stdin, but nothing was piped in. Example: op read "op://vault/investec/secret" | ipb config ${flagName} -`
    );
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const value = Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '');
  if (!value) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, `${flagName} -: stdin was empty.`);
  }
  return value;
}

async function promptForCredentials(
  existing: Record<string, string>
): Promise<Partial<Record<ConfigField, string>>> {
  const { input, password } = await import('@inquirer/prompts');
  const fields: { field: ConfigField; label: string }[] = [
    { field: 'clientId', label: 'Client ID' },
    { field: 'clientSecret', label: 'Client secret' },
    { field: 'apiKey', label: 'API key' },
  ];

  const updates: Partial<Record<ConfigField, string>> = {};
  for (const { field, label } of fields) {
    const hint = existing[field] ? ' (leave blank to keep current)' : '';
    const message = `${label}${hint}:`;
    const value = SECRET_FIELDS.has(field)
      ? await password({ message, mask: '*' })
      : await input({ message });
    if (value.trim()) {
      updates[field] = value.trim();
    }
  }
  return updates;
}
