import fs from 'node:fs';
import { CliError, ERROR_CODES } from '../errors.js';
import { isReadOnlyValue } from '../utils/read-only.js';
import { isReadOnlyFromEnv } from '../utils/runtime-flags.js';
import {
  deleteProfile,
  deleteStoredCredentials,
  getActiveProfile,
  getProfilePath,
  getSafeText,
  listProfiles,
  listStoredCredentialPaths,
  openInEditor,
  readProfile,
  setActiveProfile,
} from '../utils.js';

/**
 * Lists configuration profiles and highlights the active one (shared by `ipb config` and `ipb config profile list`).
 */
export async function runConfigProfileList(): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length === 0) {
    console.log(
      'No profiles found. Create one with: ipb config --profile <name> --client-id <id> --client-secret <secret> --api-key <key>'
    );
  } else {
    const activeProfile = await getActiveProfile();
    console.log('Available profiles:');
    for (const profile of profiles) {
      const marker = profile === activeProfile ? ' (active)' : '';
      console.log(`  - ${profile}${marker}`);
    }
  }
}

/**
 * Sets the active profile after verifying it exists.
 */
export async function runConfigProfileSet(profileName: string): Promise<void> {
  try {
    await readProfile(profileName);
    await setActiveProfile(profileName);
    console.log(getSafeText(`✅ Active profile set to: ${profileName}`));
  } catch (error) {
    if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
      throw new CliError(
        ERROR_CODES.FILE_NOT_FOUND,
        `Profile "${profileName}" does not exist. Create it first with: ipb config --profile ${profileName} --client-id <id> --client-secret <secret> --api-key <key>`
      );
    }
    throw error;
  }
}

/**
 * Prints the active profile or a message when using default credentials.
 */
export async function runConfigProfileShow(): Promise<void> {
  const activeProfile = await getActiveProfile();
  if (activeProfile) {
    console.log(`Active profile: ${activeProfile}`);
  } else {
    console.log('No active profile set. Using default credentials.');
  }
}

/**
 * Call after a successful `deleteProfile(name)` to clear the active marker and print status.
 */
export async function finalizeProfileDeletion(profileName: string): Promise<void> {
  const activeProfile = await getActiveProfile();
  if (activeProfile === profileName) {
    await setActiveProfile(null);
    console.log(
      getSafeText(`✅ Profile "${profileName}" deleted and cleared from active profile.`)
    );
  } else {
    console.log(getSafeText(`✅ Profile "${profileName}" deleted.`));
  }
}

/**
 * Deletes a profile then updates active-profile state (no spinner — use inside `withSpinner` when needed).
 */
export async function runConfigProfileDelete(profileName: string): Promise<void> {
  await deleteProfile(profileName);
  await finalizeProfileDeletion(profileName);
}

export interface ConfigDeleteOptions {
  /** Also delete every profile and the active-profile setting. */
  all?: boolean;
  yes?: boolean;
}

function fileTurnsOnReadOnly(filePath: string): boolean {
  try {
    return isReadOnlyValue(JSON.parse(fs.readFileSync(filePath, 'utf8')).readOnly);
  } catch {
    return false;
  }
}

/**
 * Deletes stored credentials: the default credentials file, and with `all` every profile too.
 */
export async function runConfigDelete(options: ConfigDeleteOptions): Promise<void> {
  const paths = listStoredCredentialPaths(Boolean(options.all));
  if (paths.length === 0) {
    console.log(
      options.all
        ? 'No stored credentials or profiles to delete.'
        : 'No stored credentials to delete.'
    );
    return;
  }

  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  // Deleting the file that turns on read-only mode would switch it off, so a person must confirm.
  const removesReadOnly = isReadOnlyFromEnv() || paths.some(fileTurnsOnReadOnly);
  if (removesReadOnly && !interactive) {
    throw new CliError(
      ERROR_CODES.READ_ONLY,
      'Read-only mode is on, so deleting stored credentials needs an interactive terminal (even with --yes).'
    );
  }
  if (!options.yes && !interactive) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      'Cannot ask for confirmation without an interactive terminal. Re-run with --yes to delete stored credentials.'
    );
  }

  console.log('This will delete:');
  for (const filePath of paths) {
    console.log(`  ${filePath}`);
  }
  if (!options.yes || removesReadOnly) {
    const { confirm } = await import('@inquirer/prompts');
    const confirmed = await confirm({
      message: 'Delete these files? Your saved API keys will be gone.',
      default: false,
    });
    if (!confirmed) {
      console.log('Nothing deleted.');
      return;
    }
  }

  await deleteStoredCredentials(paths);
  console.log(getSafeText(`🗑️ Deleted ${paths.length} file(s).`));
  if (process.env.INVESTEC_CLIENT_ID || process.env.INVESTEC_API_KEY) {
    console.log('Credentials from INVESTEC_* environment variables still apply.');
  }
}

export interface ConfigEditOptions {
  profile?: string;
  /** Absolute path to the default credentials JSON file (e.g. `credentialLocation.filename`). */
  defaultCredentialsFile: string;
}

/**
 * Opens the default credentials file or a named profile file in `EDITOR`.
 */
export async function runConfigEdit(options: ConfigEditOptions): Promise<void> {
  const filepath = options.profile
    ? getProfilePath(options.profile)
    : options.defaultCredentialsFile;

  const editor = process.env.EDITOR || 'default editor';
  console.log(`Opening ${filepath} in ${editor}...`);
  await openInEditor(filepath);
  const successText = getSafeText('✅ Credentials file saved');
  console.log(successText);
}
