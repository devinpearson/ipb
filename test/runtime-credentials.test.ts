/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials } from '../src/cmds/types.js';
import { CliError, ERROR_CODES } from '../src/errors.js';

const store = vi.hoisted(() => ({
  activeProfile: null as string | null,
  profile: {} as Record<string, unknown>,
  credentialsFile: {} as Record<string, unknown>,
}));

vi.mock('../src/utils/credentials-store.ts', () => ({
  readCredentialsFileSync: () => ({}),
  getActiveProfile: vi.fn(async () => store.activeProfile),
  loadProfile: vi.fn(async (creds: Credentials) => ({ ...creds, ...store.profile })),
  loadCredentialsFile: vi.fn(async (creds: Credentials) => ({
    ...creds,
    ...store.credentialsFile,
  })),
}));

const { optionCredentials, optionMauCredentials } = await import('../src/runtime-credentials.js');

function base(readOnly = ''): Credentials {
  return {
    host: 'h',
    clientId: 'c',
    clientSecret: 's',
    apiKey: 'k',
    cardKey: '',
    openaiKey: '',
    sandboxKey: '',
    mauHost: '',
    mauClientId: '',
    mauClientSecret: '',
    mauApiKey: '',
    readOnly,
  };
}

describe('readOnly across credential layers', () => {
  beforeEach(() => {
    store.activeProfile = null;
    store.profile = {};
    store.credentialsFile = {};
  });

  it('keeps read-only on when the default file says so and a profile says false', async () => {
    store.profile = { readOnly: 'false' };
    const creds = await optionCredentials({ profile: 'free' } as never, base('true'));
    expect(creds.readOnly).toBe('true');
  });

  it('keeps read-only on when the default file says so and the active profile says false', async () => {
    store.activeProfile = 'free';
    store.profile = { readOnly: 'false' };
    const creds = await optionCredentials({} as never, base('true'));
    expect(creds.readOnly).toBe('true');
  });

  it('turns read-only on when only the profile asks for it', async () => {
    store.profile = { readOnly: true };
    const creds = await optionMauCredentials({ profile: 'agent' } as never, base(''));
    expect(creds.readOnly).toBe('true');
  });

  it('turns read-only on from a --credentials-file', async () => {
    store.credentialsFile = { readOnly: 'true' };
    const creds = await optionCredentials({ credentialsFile: 'agent.json' } as never, base(''));
    expect(creds.readOnly).toBe('true');
  });

  it('stays off when no layer asks for it', async () => {
    store.profile = { readOnly: 'false' };
    const creds = await optionCredentials({ profile: 'x' } as never, base(''));
    expect(creds.readOnly).toBe('false');
  });
});

describe('--profile with --credentials-file', () => {
  it.each([
    ['optionCredentials', optionCredentials],
    ['optionMauCredentials', optionMauCredentials],
  ])('%s refuses both instead of silently ignoring one', async (_name, resolve) => {
    const error = await resolve(
      { profile: 'prod', credentialsFile: 'other.json' } as never,
      base('')
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe(ERROR_CODES.INVALID_INPUT);
    expect((error as CliError).message).toContain(
      'Use either --profile or --credentials-file, not both.'
    );
  });
});

describe('default host', () => {
  async function defaultsWith(fileHost: string | undefined, envHost: string | undefined) {
    vi.resetModules();
    vi.doMock('../src/utils/credentials-store.ts', () => ({
      readCredentialsFileSync: () => (fileHost ? { host: fileHost } : {}),
    }));
    vi.stubEnv('INVESTEC_HOST', envHost ?? '');
    const { credentials } = await import('../src/runtime-credentials.js');
    vi.doUnmock('../src/utils/credentials-store.ts');
    vi.unstubAllEnvs();
    return credentials.host;
  }

  it('uses the host saved with ipb config --host', async () => {
    expect(await defaultsWith('https://file.test', undefined)).toBe('https://file.test');
  });

  it('lets INVESTEC_HOST override the saved host', async () => {
    expect(await defaultsWith('https://file.test', 'https://env.test')).toBe('https://env.test');
  });

  it('falls back to the Investec API', async () => {
    expect(await defaultsWith(undefined, undefined)).toBe('https://openapi.investec.com');
  });
});
