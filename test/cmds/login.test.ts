/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loginCommand } from '../../src/cmds/login';
import { CliError, ERROR_CODES } from '../../src/errors';

const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('node-fetch', () => ({
  default: mockFetch,
}));

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentialLocation: {
    folder: '/tmp/ipb-login-test',
    filename: '/tmp/ipb-login-test/.credentials.json',
  },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const credState = vi.hoisted(() => ({
  file: {} as Record<string, string>,
}));

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
    ensureCredentialsDirectory: vi.fn(async () => {}),
    normalizeFilePath: vi.fn((p: string) => p),
    readCredentialsFile: vi.fn(async () => ({ ...credState.file })),
    writeCredentialsFile: vi.fn(async (_path: string, data: Record<string, string>) => {
      credState.file = { ...data };
    }),
  };
});

const { writeCredentialsFile, readCredentialsFile } = await import('../../src/utils.ts');

describe('loginCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    credState.file = { clientId: '', clientSecret: '', apiKey: '', cardKey: '' };
  });

  it('saves access_token to sandboxKey on successful login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '',
      json: async () => ({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        created_at: 1,
      }),
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await loginCommand({
      email: 'user@example.com',
      password: 'secret12',
      credentialsFile: '',
      verbose: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ipb.sandboxpay.co.za/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'secret12' }),
      })
    );
    expect(writeCredentialsFile).toHaveBeenCalled();
    const written = (writeCredentialsFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      string
    >;
    expect(written.sandboxKey).toBe('test-access-token');
    expect(logSpy).toHaveBeenCalledWith('Login successful');
    logSpy.mockRestore();
  });

  it('throws CliError when login response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    });

    await expect(
      loginCommand({
        email: 'user@example.com',
        password: 'secret12',
        credentialsFile: '',
        verbose: false,
      })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_CREDENTIALS &&
        err.message.includes('Login failed')
    );
  });

  it('reads existing credentials before merging token', async () => {
    credState.file = {
      clientId: 'cid',
      clientSecret: 'sec',
      apiKey: 'key',
      cardKey: '1',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '',
      json: async () => ({
        access_token: 'tok',
        token_type: 'Bearer',
        expires_in: 1,
        created_at: 1,
      }),
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await loginCommand({
      email: 'a@b.com',
      password: 'secret12',
      credentialsFile: '',
      verbose: false,
    });

    expect(readCredentialsFile).toHaveBeenCalled();
    const written = (writeCredentialsFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      string
    >;
    expect(written.clientId).toBe('cid');
    expect(written.sandboxKey).toBe('tok');
  });
});
