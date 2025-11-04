import https from 'node:https';
import { input, password } from '@inquirer/prompts';
import fetch from 'node-fetch';
import { CliError, ERROR_CODES } from '../errors.js';
import { printTitleBox } from '../index.js';
import type { CommonOptions } from './types.js';

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
});
interface Options extends CommonOptions {
  email: string;
  password: string;
}

/**
 * Registers a new account with the server for LLM generation.
 * @param options - CLI options including email and password
 * @throws {CliError} When email/password are missing or registration fails
 */
export async function registerCommand(options: Options) {
  printTitleBox();
  // Prompt for email and password if not provided
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
    throw new CliError(ERROR_CODES.MISSING_EMAIL_OR_PASSWORD, 'Email and password are required');
  }
  console.log('💳 registering account');
  const result = await fetch('https://ipb.sandboxpay.co.za/auth/register', {
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
    throw new CliError(
      ERROR_CODES.INVALID_CREDENTIALS,
      `Registration failed: ${result.status} ${body}`
    );
  }

  console.log('Account registered successfully');
}
