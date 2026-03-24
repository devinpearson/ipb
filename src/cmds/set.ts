import { CliError, ERROR_CODES } from '../errors.js';
import { credentialLocation } from '../index.js';
import {
  createSpinner,
  deleteProfile,
  ensureCredentialsDirectory,
  getActiveProfile,
  getSafeText,
  isStdoutPiped,
  listProfiles,
  readCredentialsFile,
  readProfile,
  resolveSpinnerState,
  setActiveProfile,
  withSpinner,
  writeCredentialsFile,
  writeProfile,
} from '../utils.js';

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
    return;
  }

  if (options.show) {
    const activeProfile = await getActiveProfile();
    if (activeProfile) {
      console.log(`Active profile: ${activeProfile}`);
    } else {
      console.log('No active profile set. Using default credentials.');
    }
    return;
  }

  if (options.set) {
    // Verify profile exists
    try {
      await readProfile(options.set);
      await setActiveProfile(options.set);
      console.log(`✅ Active profile set to: ${options.set}`);
    } catch (error) {
      if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
        throw new CliError(
          ERROR_CODES.FILE_NOT_FOUND,
          `Profile "${options.set}" does not exist. Create it first with: ipb config --profile ${options.set} --client-id <id> --client-secret <secret> --api-key <key>`
        );
      }
      throw error;
    }
    return;
  }

  if (options.delete) {
    const profileToDelete = options.delete;
    await runWithConfigSpinner(options, 'Removing profile...', () =>
      deleteProfile(profileToDelete)
    );
    // If the deleted profile was active, clear the active profile
    const activeProfile = await getActiveProfile();
    if (activeProfile === profileToDelete) {
      await setActiveProfile(null);
      console.log(`✅ Profile "${profileToDelete}" deleted and cleared from active profile.`);
    } else {
      console.log(`✅ Profile "${profileToDelete}" deleted.`);
    }
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
