/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError } from '../../src/errors';
import { registerCommand } from '../../src/cmds/register';

const mockInput = vi.hoisted(() => vi.fn());
const mockPassword = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
  password: mockPassword,
}));

vi.mock('node-fetch', () => ({
  default: mockFetch,
}));

vi.mock('../../src/index.ts', () => ({
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

describe('registerCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  it('registers successfully with provided credentials', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn(async () => ''),
    });

    await registerCommand({
      email: 'user@example.com',
      password: 'secure-pass',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ipb.sandboxpay.co.za/auth/register',
      expect.objectContaining({ method: 'POST' })
    );
    expect(console.log).toHaveBeenCalledWith('Account registered successfully');
  });

  it('prompts for missing email and password', async () => {
    mockInput.mockResolvedValue('prompted@example.com');
    mockPassword.mockResolvedValue('prompted-pass');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn(async () => ''),
    });

    await registerCommand({
      email: '',
      password: '',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(mockInput).toHaveBeenCalledTimes(1);
    expect(mockPassword).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('throws CliError when API registration fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn(async () => 'Unauthorized'),
    });

    await expect(
      registerCommand({
        email: 'user@example.com',
        password: 'secure-pass',
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
      })
    ).rejects.toThrow(CliError);
  });
});
