/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCommand } from '../../src/cmds/register';
import { CliError, ERROR_CODES } from '../../src/errors';

const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('node-fetch', () => ({
  default: mockFetch,
}));

vi.mock('../../src/runtime-credentials.ts', async () => {
  const { getRuntimeCredentialsMock } = await import('../helpers/cli-mocks.js');
  return getRuntimeCredentialsMock();
});

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    getSafeText: vi.fn((text: string) => text),
    isStdoutPiped: vi.fn(() => false),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      clear: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
    })),
    withSpinner: vi.fn(async (_s, _e, fn: () => Promise<unknown>) => await fn()),
  };
});

describe('registerCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('posts email and password and logs success when registration succeeds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await registerCommand({
      email: 'user@example.com',
      password: 'secret12',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ipb.sandboxpay.co.za/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'secret12' }),
      })
    );
    expect(logSpy).toHaveBeenCalledWith('Account registered successfully');
    logSpy.mockRestore();
  });

  it('throws CliError when registration response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad request',
    });

    await expect(
      registerCommand({
        email: 'user@example.com',
        password: 'secret12',
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
      })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_CREDENTIALS &&
        err.message.includes('Registration failed')
    );
  });
});
