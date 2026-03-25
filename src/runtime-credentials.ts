// Shared CLI credential defaults and option merging. Loaded by commands and API helpers
// without importing the main entrypoint (avoids circular index ↔ cmds ↔ utils/api).

import { homedir } from 'node:os';
import process from 'node:process';
import chalk from 'chalk';
import type { BasicOptions, Credentials } from './cmds/types.js';
import {
  getActiveProfile,
  loadCredentialsFile,
  loadProfile,
  readCredentialsFileSync,
} from './utils/credentials-store.js';
import { getSafeText } from './utils/terminal.js';

/** Default Investec credential file locations under the user home directory. */
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};

/**
 * Prints CLI title (currently unused, kept for potential future use).
 */
export async function printTitleBox(): Promise<void> {
  // Function intentionally empty - can be implemented if needed
}

const cred = readCredentialsFileSync(credentialLocation, (err) => {
  const errorText = getSafeText(`🙀 Invalid credentials file format: ${err.message}`);
  console.error(chalk.red(errorText));
  console.log('');
});

/** Default credentials from env and optional ~/.ipb/.credentials.json (module init). */
export const credentials: Credentials = {
  host: process.env.INVESTEC_HOST || 'https://openapi.investec.com',
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId || '',
  clientSecret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret || '',
  apiKey: process.env.INVESTEC_API_KEY || cred.apiKey || '',
  cardKey: process.env.INVESTEC_CARD_KEY || cred.cardKey || '',
  openaiKey: process.env.OPENAI_API_KEY || cred.openaiKey || '',
  sandboxKey: process.env.SANDBOX_KEY || cred.sandboxKey || '',
};

/**
 * Merges CLI options with credentials, applying profile and option overrides.
 * @param options - Basic options that may contain credential overrides
 * @param base - Base credentials object (typically module `credentials`)
 * @returns Updated credentials with overrides applied
 */
export async function optionCredentials(
  options: BasicOptions & { profile?: string },
  base: Credentials
): Promise<Credentials> {
  let creds = base;

  if (options.profile) {
    creds = await loadProfile(creds, options.profile);
  } else {
    const activeProfile = await getActiveProfile();
    if (activeProfile) {
      creds = await loadProfile(creds, activeProfile);
    }

    if (options.credentialsFile) {
      creds = await loadCredentialsFile(creds, options.credentialsFile);
    }
  }

  if (options.apiKey) {
    creds.apiKey = options.apiKey;
  }
  if (options.clientId) {
    creds.clientId = options.clientId;
  }
  if (options.clientSecret) {
    creds.clientSecret = options.clientSecret;
  }
  if (options.host) {
    creds.host = options.host;
  }
  return creds;
}
