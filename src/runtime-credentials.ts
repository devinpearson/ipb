// Shared CLI credential defaults and option merging. Loaded by commands and API helpers
// without importing the main entrypoint (avoids circular index ↔ cmds ↔ utils/api).

import { homedir } from 'node:os';
import process from 'node:process';
import chalk from 'chalk';
import type { BasicOptions, Credentials, MauBasicOptions } from './cmds/types.js';
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

const defaultHost = 'https://openapi.investec.com';

/** Default credentials from env and optional ~/.ipb/.credentials.json (module init). */
export const credentials: Credentials = {
  host: process.env.INVESTEC_HOST || 'https://openapi.investec.com',
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId || '',
  clientSecret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret || '',
  apiKey: process.env.INVESTEC_API_KEY || cred.apiKey || '',
  cardKey: process.env.INVESTEC_CARD_KEY || cred.cardKey || '',
  openaiKey: process.env.OPENAI_API_KEY || cred.openaiKey || '',
  sandboxKey: process.env.SANDBOX_KEY || cred.sandboxKey || '',
  mauHost: process.env.INVESTEC_MAU_HOST || cred.mauHost || defaultHost,
  mauClientId: process.env.INVESTEC_MAU_CLIENT_ID || cred.mauClientId || '',
  mauClientSecret: process.env.INVESTEC_MAU_CLIENT_SECRET || cred.mauClientSecret || '',
  mauApiKey: process.env.INVESTEC_MAU_API_KEY || cred.mauApiKey || '',
};

/**
 * Resolves profile / credentials-file / active profile onto base credentials.
 */
async function resolveCredentialSource(
  options: { profile?: string; credentialsFile?: string },
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

  return creds;
}

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
  const creds = await resolveCredentialSource(options, base);

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

/**
 * Merges CLI options with credentials for Mauritius (MAU) API calls.
 * Reuses profile / credentials-file resolution; applies MAU-specific overrides only.
 * @param options - MAU credential override options
 * @param base - Base credentials object (typically module `credentials`)
 * @returns Updated credentials with MAU overrides applied
 */
export async function optionMauCredentials(
  options: MauBasicOptions,
  base: Credentials
): Promise<Credentials> {
  const creds = await resolveCredentialSource(options, base);

  if (options.mauApiKey) {
    creds.mauApiKey = options.mauApiKey;
  }
  if (options.mauClientId) {
    creds.mauClientId = options.mauClientId;
  }
  if (options.mauClientSecret) {
    creds.mauClientSecret = options.mauClientSecret;
  }
  if (options.mauHost) {
    creds.mauHost = options.mauHost;
  }
  return creds;
}
