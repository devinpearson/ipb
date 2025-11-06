import https from 'node:https';
import path from 'node:path';
import { input, password } from '@inquirer/prompts';
import fetch from 'node-fetch';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentialLocation, printTitleBox } from '../index.js';
import {
  ensureCredentialsDirectory,
  normalizeFilePath,
  readCredentialsFile,
  writeCredentialsFile,
} from '../utils.js';

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
  
  // Resolve credential file path from options or use default
  const credentialFilePath = options.credentialsFile
    ? normalizeFilePath(options.credentialsFile)
    : credentialLocation.filename;
  const credentialFolder = path.dirname(credentialFilePath);
  
  // Ensure directory exists before any read/write operations
  await ensureCredentialsDirectory({ folder: credentialFolder });
  
  // Read credentials from the resolved path
  const cred = await readCredentialsFile({
    filename: credentialFilePath,
    folder: credentialFolder,
  });
  
  // Update and write back to the resolved path
  cred.sandboxKey = loginResponse.access_token;
  await writeCredentialsFile(credentialFilePath, cred);
  console.log('🔑 access token saved');
}
