import { credentialLocation } from '../index.js';
import {
  ensureCredentialsDirectory,
  readCredentialsFile,
  writeCredentialsFile,
} from '../utils.js';

interface Options {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
  openaiKey: string;
  sandboxKey: string;
  verbose: boolean;
}

/**
 * Sets authentication credentials and saves them securely.
 * @param options - CLI options for credentials (API key, client ID, client secret, card key, OpenAI key, sandbox key)
 * @throws {Error} When file operations fail
 */
export async function configCommand(options: Options) {
  let cred = await readCredentialsFile(credentialLocation);
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
  await writeCredentialsFile(credentialLocation.filename, cred);
  console.log('🔑 credentials saved');
}
