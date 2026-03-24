/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configCommand } from '../../src/cmds/set';
import { CliError, ERROR_CODES } from '../../src/errors';

vi.mock('../../src/index.ts', () => ({
  credentialLocation: {
    folder: '/tmp/.ipb',
    filename: '/tmp/.ipb/.credentials.json',
  },
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockState = vi.hoisted(() => ({
  profiles: ['prod', 'staging'],
  activeProfile: 'prod' as string | null,
  cred: {
    clientId: '',
    clientSecret: '',
    apiKey: '',
    cardKey: '',
    openaiKey: '',
    sandboxKey: '',
  },
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
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
    listProfiles: vi.fn(async () => mockState.profiles),
    getActiveProfile: vi.fn(async () => mockState.activeProfile),
    readProfile: vi.fn(async (_name: string) => ({ clientId: 'existing' })),
    setActiveProfile: vi.fn(async (_name: string | null) => undefined),
    deleteProfile: vi.fn(async (_name: string) => undefined),
    writeProfile: vi.fn(async (_name: string, _data: Record<string, string>) => undefined),
    readCredentialsFile: vi.fn(async () => ({ ...mockState.cred })),
    ensureCredentialsDirectory: vi.fn(async () => undefined),
    writeCredentialsFile: vi.fn(async (_path: string, _data: Record<string, string>) => undefined),
  };
});

function baseOptions() {
  return {
    clientId: '',
    clientSecret: '',
    apiKey: '',
    cardKey: '',
    openaiKey: '',
    sandboxKey: '',
    verbose: false,
  };
}

describe('configCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockState.profiles = ['prod', 'staging'];
    mockState.activeProfile = 'prod';
    mockState.cred = {
      clientId: '',
      clientSecret: '',
      apiKey: '',
      cardKey: '',
      openaiKey: '',
      sandboxKey: '',
    };
  });

  it('lists profiles and marks active profile', async () => {
    await configCommand({
      ...baseOptions(),
      list: true,
    });

    expect(console.log).toHaveBeenCalledWith('Available profiles:');
    expect(console.log).toHaveBeenCalledWith('  - prod (active)');
  });

  it('sets active profile when profile exists', async () => {
    const { setActiveProfile } = await import('../../src/utils.ts');
    await configCommand({
      ...baseOptions(),
      set: 'prod',
    });

    expect(setActiveProfile).toHaveBeenCalledWith('prod');
  });

  it('throws helpful error when setting missing profile', async () => {
    const { readProfile } = await import('../../src/utils.ts');
    (readProfile as vi.Mock).mockRejectedValue(
      new CliError(ERROR_CODES.FILE_NOT_FOUND, 'Profile missing')
    );

    await expect(
      configCommand({
        ...baseOptions(),
        set: 'missing',
      })
    ).rejects.toThrow(CliError);
  });

  it('writes profile data when profile option is provided', async () => {
    const { writeProfile } = await import('../../src/utils.ts');
    await configCommand({
      ...baseOptions(),
      profile: 'prod',
      clientId: 'cid',
      clientSecret: 'secret',
      apiKey: 'key',
    });

    expect(writeProfile).toHaveBeenCalledWith(
      'prod',
      expect.objectContaining({
        clientId: 'cid',
        clientSecret: 'secret',
        apiKey: 'key',
      })
    );
  });

  it('writes default credentials when no profile is provided', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    await configCommand({
      ...baseOptions(),
      clientId: 'cid',
      apiKey: 'key',
    });

    expect(writeCredentialsFile).toHaveBeenCalledWith(
      '/tmp/.ipb/.credentials.json',
      expect.objectContaining({
        clientId: 'cid',
        apiKey: 'key',
      })
    );
  });
});
