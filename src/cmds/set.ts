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

interface Options {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
  openaiKey: string;
  sandboxKey: string;
  profile?: string;
  verbose: boolean;
  spinner?: boolean;
}

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
  if (options.profile) {
    const profileName = options.profile;
    // Save to profile
    const profileData: Record<string, string> = {};

    // Read existing profile if it exists
    try {
      const existing = await readProfile(profileName);
      Object.assign(profileData, existing);
    } catch {
      // Profile doesn't exist yet, start with defaults
    }

    // Update with provided values
    if (options.clientId) {
      profileData.clientId = options.clientId;
    }
    if (options.apiKey) {
      profileData.apiKey = options.apiKey;
    }
    if (options.clientSecret) {
      profileData.clientSecret = options.clientSecret;
    }
    if (options.cardKey) {
      profileData.cardKey = options.cardKey;
    }
    if (options.openaiKey) {
      profileData.openaiKey = options.openaiKey;
    }
    if (options.sandboxKey) {
      profileData.sandboxKey = options.sandboxKey;
    }

    await runWithConfigSpinner(options, `Saving profile "${profileName}"...`, () =>
      writeProfile(profileName, profileData)
    );
    console.log(`🔑 Profile "${profileName}" saved`);
  } else {
    // Save to default credentials file
    const cred = await readCredentialsFile(credentialLocation);
    if (Object.values(cred).every((v) => v === '')) {
      // File doesn't exist, ensure directory exists
      await ensureCredentialsDirectory(credentialLocation);
    }

    if (options.clientId) {
      cred.clientId = options.clientId;
    }
    if (options.apiKey) {
      cred.apiKey = options.apiKey;
    }
    if (options.clientSecret) {
      cred.clientSecret = options.clientSecret;
    }
    if (options.cardKey) {
      cred.cardKey = options.cardKey;
    }
    if (options.openaiKey) {
      cred.openaiKey = options.openaiKey;
    }
    if (options.sandboxKey) {
      cred.sandboxKey = options.sandboxKey;
    }
    await runWithConfigSpinner(options, 'Saving credentials...', () =>
      writeCredentialsFile(credentialLocation.filename, cred)
    );
    console.log('🔑 credentials saved');
  }
}
