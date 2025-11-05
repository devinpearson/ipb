import https from 'node:https';
import { input, password } from '@inquirer/prompts';
import fetch from 'node-fetch';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentialLocation, printTitleBox } from '../index.js';
import { ensureCredentialsDirectory, readCredentialsFile, writeCredentialsFile } from '../utils.js';

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
});

interface Options {
  email: string;
  password: string;
  credentialsFile: string;
  verbose: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  created_at: number;
}

/**
 * Logs in with the server for LLM generation and saves the access token.
 * @param options - CLI options including email and password
 * @throws {CliError} When email/password are missing, login fails, or file operations fail
 */
export async function loginCommand(options: Options) {
  printTitleBox();
  if (!options.email) {
    options.email = await input({
      message: 'Enter your email:',
      validate: (input: string) => input.includes('@') || 'Please enter a valid email.',
    });
  }
  if (!options.password) {
    options.password = await password({
      message: 'Enter your password:',
      mask: '*',
      validate: (input: string) => input.length >= 6 || 'Password must be at least 6 characters.',
    });
  }
  if (!options.email || !options.password) {
    throw new CliError(ERROR_CODES.INVALID_CREDENTIALS, 'Email and password are required');
  }
  console.log('💳 logging into account');
  const result = await fetch('https://ipb.sandboxpay.co.za/auth/login', {
    agent,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: options.email,
      password: options.password,
    }),
  });
  if (!result.ok) {
    const body = await result.text();
    throw new CliError(ERROR_CODES.INVALID_CREDENTIALS, `Login failed: ${result.status} ${body}`);
  }
  const loginResponse: LoginResponse = (await result.json()) as LoginResponse;
  console.log('Login successful');
  const cred = await readCredentialsFile(credentialLocation);
  if (Object.values(cred).every((v) => v === '')) {
    // File doesn't exist, ensure directory exists before creating
    await ensureCredentialsDirectory(credentialLocation);
    await writeCredentialsFile(credentialLocation.filename, cred);
  }
  cred.sandboxKey = loginResponse.access_token;
  await writeCredentialsFile(credentialLocation.filename, cred);
  console.log('🔑 access token saved');
}
