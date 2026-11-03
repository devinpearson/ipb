import chalk from 'chalk';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentialLocation } from '../runtime-credentials.js';
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

const SECRET_FIELDS: ReadonlySet<ConfigField> = new Set([
  'clientSecret',
  'apiKey',
  'openaiKey',
  'sandboxKey',
  'mauClientSecret',
  'mauApiKey',
]);

const FLAG_NAMES: Record<ConfigField, string> = {
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
      existing = { ...(await readProfile(profileName)) };
    } catch {
      existing = {};
    }
  } else {
    existing = { ...(await readCredentialsFile(credentialLocation)) } as Record<string, string>;
  }

  let updates = await readFlagValues(options);
  if (Object.keys(updates).length === 0) {
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

  const merged = { ...existing, ...updates };
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
