import fs, { promises as fsPromises } from 'node:fs';
import { credentialLocation } from '../index.js';
import { handleCliError, writeCredentialsFile } from '../utils.js';

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
  try {
    let cred = {
      clientId: '',
      clientSecret: '',
      apiKey: '',
      cardKey: '',
      openaiKey: '',
      sandboxKey: '',
    };
    if (fs.existsSync(credentialLocation.filename)) {
      const data = await fsPromises.readFile(credentialLocation.filename, 'utf8');
      cred = JSON.parse(data);
    } else {
      if (!fs.existsSync(credentialLocation.folder)) {
        await fsPromises.mkdir(credentialLocation.folder, { recursive: true });
      }
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
  } catch (error: unknown) {
    handleCliError(error, options, 'set credentials');
  }
}
