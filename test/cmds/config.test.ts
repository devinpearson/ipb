/// <reference types="vitest" />

import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configCommand } from '../../src/cmds/set';
import { CliError, ERROR_CODES } from '../../src/errors';
import { setInteractive } from '../helpers/tty';

const mockPrompts = vi.hoisted(() => ({ input: vi.fn(), password: vi.fn(), confirm: vi.fn() }));

vi.mock('@inquirer/prompts', () => mockPrompts);

function replaceStdin(chunks: string[]): () => void {
  const original = Object.getOwnPropertyDescriptor(process, 'stdin');
  Object.defineProperty(process, 'stdin', {
    value: Readable.from(chunks.map((c) => Buffer.from(c))),
    configurable: true,
  });
  return () => {
    if (original) {
      Object.defineProperty(process, 'stdin', original);
    }
  };
}

vi.mock('../../src/runtime-credentials.ts', () => ({
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
    mockPrompts.input.mockReset();
    mockPrompts.password.mockReset();
    mockPrompts.confirm.mockReset();
    delete process.env.IPB_READ_ONLY;
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

  it('saves --host to the default credentials file and to a profile', async () => {
    const { writeCredentialsFile, writeProfile } = await import('../../src/utils.ts');
    await configCommand({ ...baseOptions(), host: 'https://sandbox.example.test' });
    await configCommand({
      ...baseOptions(),
      profile: 'prod',
      host: 'https://sandbox.example.test',
    });

    expect(writeCredentialsFile).toHaveBeenCalledWith(
      '/tmp/.ipb/.credentials.json',
      expect.objectContaining({ host: 'https://sandbox.example.test' })
    );
    expect(writeProfile).toHaveBeenCalledWith(
      'prod',
      expect.objectContaining({ host: 'https://sandbox.example.test' })
    );
  });

  it('writes MAU credentials to the default credentials file', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    await configCommand({
      ...baseOptions(),
      mauClientId: 'mau-cid',
      mauClientSecret: 'mau-secret',
      mauApiKey: 'mau-key',
      mauHost: 'https://openapisandbox.investec.com',
    });

    expect(writeCredentialsFile).toHaveBeenCalledWith(
      '/tmp/.ipb/.credentials.json',
      expect.objectContaining({
        mauClientId: 'mau-cid',
        mauClientSecret: 'mau-secret',
        mauApiKey: 'mau-key',
        mauHost: 'https://openapisandbox.investec.com',
      })
    );
  });

  it('prints message when listing profiles and none exist', async () => {
    mockState.profiles = [];
    await configCommand({
      ...baseOptions(),
      list: true,
    });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No profiles found'));
  });

  it('shows active profile name when --show is used', async () => {
    mockState.activeProfile = 'prod';
    await configCommand({
      ...baseOptions(),
      show: true,
    });

    expect(console.log).toHaveBeenCalledWith('Active profile: prod');
  });

  it('shows default-credentials message when no active profile', async () => {
    mockState.activeProfile = null;
    await configCommand({
      ...baseOptions(),
      show: true,
    });

    expect(console.log).toHaveBeenCalledWith('No active profile set. Using default credentials.');
  });

  it('deletes profile and clears active when deleted profile was active', async () => {
    const { deleteProfile, setActiveProfile } = await import('../../src/utils.ts');
    mockState.activeProfile = 'prod';

    await configCommand({
      ...baseOptions(),
      delete: 'prod',
    });

    expect(deleteProfile).toHaveBeenCalledWith('prod');
    expect(setActiveProfile).toHaveBeenCalledWith(null);
  });

  it('deletes profile without clearing active when another profile is active', async () => {
    const { deleteProfile, setActiveProfile } = await import('../../src/utils.ts');
    mockState.activeProfile = 'staging';

    await configCommand({
      ...baseOptions(),
      delete: 'prod',
    });

    expect(deleteProfile).toHaveBeenCalledWith('prod');
    expect(setActiveProfile).not.toHaveBeenCalled();
  });

  it('refuses to save nothing when not in a terminal', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    const restoreTty = setInteractive(false);
    try {
      await expect(configCommand(baseOptions())).rejects.toThrow(/Nothing to save/);
    } finally {
      restoreTty();
    }
    expect(writeCredentialsFile).not.toHaveBeenCalled();
  });

  it('prompts for credentials, hiding secrets, when run with no options in a terminal', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    mockPrompts.input.mockResolvedValueOnce(' typed-id ');
    mockPrompts.password.mockResolvedValueOnce('typed-secret').mockResolvedValueOnce('typed-key');
    const restoreTty = setInteractive(true);
    try {
      await configCommand(baseOptions());
    } finally {
      restoreTty();
    }

    expect(mockPrompts.password).toHaveBeenCalledTimes(2);
    expect(writeCredentialsFile).toHaveBeenCalledWith(
      '/tmp/.ipb/.credentials.json',
      expect.objectContaining({
        clientId: 'typed-id',
        clientSecret: 'typed-secret',
        apiKey: 'typed-key',
      })
    );
  });

  it('keeps saved values for prompts left blank', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    mockState.cred = { ...mockState.cred, clientId: 'old-id', clientSecret: 'old-secret' };
    mockPrompts.input.mockResolvedValueOnce('');
    mockPrompts.password.mockResolvedValueOnce('').mockResolvedValueOnce('new-key');
    const restoreTty = setInteractive(true);
    try {
      await configCommand(baseOptions());
    } finally {
      restoreTty();
    }

    expect(mockPrompts.input).toHaveBeenCalledWith({
      message: 'Client ID (leave blank to keep current):',
    });
    expect(writeCredentialsFile).toHaveBeenCalledWith(
      '/tmp/.ipb/.credentials.json',
      expect.objectContaining({ clientId: 'old-id', clientSecret: 'old-secret', apiKey: 'new-key' })
    );
  });

  it('does not write anything when every prompt is left blank', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    mockPrompts.input.mockResolvedValueOnce('');
    mockPrompts.password.mockResolvedValue('');
    const restoreTty = setInteractive(true);
    try {
      await configCommand(baseOptions());
    } finally {
      restoreTty();
    }

    expect(console.log).toHaveBeenCalledWith('Nothing changed.');
    expect(writeCredentialsFile).not.toHaveBeenCalled();
  });

  it('reads a secret from stdin when its value is "-"', async () => {
    const { writeCredentialsFile } = await import('../../src/utils.ts');
    const restoreStdin = replaceStdin(['piped-', 'secret\n']);
    try {
      await configCommand({ ...baseOptions(), clientId: 'cid', clientSecret: '-' });
    } finally {
      restoreStdin();
    }

    expect(writeCredentialsFile).toHaveBeenCalledWith(
      '/tmp/.ipb/.credentials.json',
      expect.objectContaining({ clientId: 'cid', clientSecret: 'piped-secret' })
    );
  });

  it('rejects more than one option reading from stdin', async () => {
    await expect(
      configCommand({ ...baseOptions(), clientSecret: '-', apiKey: '-' })
    ).rejects.toThrow(/Only one option can read from stdin/);
  });

  it('rejects "-" when nothing is piped in', async () => {
    const restoreTty = setInteractive(true);
    try {
      await expect(configCommand({ ...baseOptions(), clientSecret: '-' })).rejects.toThrow(
        /nothing was piped in/
      );
    } finally {
      restoreTty();
    }
  });

  it('warns that secrets passed as flags end up in shell history', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const restoreTty = setInteractive(true);
    try {
      await configCommand({ ...baseOptions(), clientId: 'cid', clientSecret: 'literal' });
    } finally {
      restoreTty();
    }

    const warning = String(warnSpy.mock.calls[0]?.[0]);
    expect(warning).toContain('--client-secret');
    expect(warning).not.toContain('--client-id');
    warnSpy.mockRestore();
  });

  it('merges new fields into existing profile data', async () => {
    const { readProfile, writeProfile } = await import('../../src/utils.ts');
    (readProfile as vi.Mock).mockResolvedValueOnce({
      clientId: 'existing-id',
      apiKey: 'existing-key',
      clientSecret: 'old-secret',
    });

    await configCommand({
      ...baseOptions(),
      profile: 'prod',
      clientSecret: 'rotated-secret',
    });

    expect(writeProfile).toHaveBeenCalledWith(
      'prod',
      expect.objectContaining({
        clientId: 'existing-id',
        apiKey: 'existing-key',
        clientSecret: 'rotated-secret',
      })
    );
  });

  describe('read-only mode', () => {
    it('--read-only stores readOnly and says what it blocks', async () => {
      const { writeCredentialsFile } = await import('../../src/utils.ts');
      await configCommand({ ...baseOptions(), readOnly: true });

      expect(writeCredentialsFile).toHaveBeenCalledWith(
        '/tmp/.ipb/.credentials.json',
        expect.objectContaining({ readOnly: 'true' })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Read-only mode is on: payments, transfers and card code changes are blocked'
        )
      );
    });

    it('--read-only works with a profile and other fields in one go', async () => {
      const { writeProfile } = await import('../../src/utils.ts');
      await configCommand({ ...baseOptions(), profile: 'agent', clientId: 'cid', readOnly: true });

      expect(writeProfile).toHaveBeenCalledWith(
        'agent',
        expect.objectContaining({ clientId: 'cid', readOnly: 'true' })
      );
    });

    it('refuses --no-read-only without a terminal, so an agent cannot turn it off', async () => {
      const { writeCredentialsFile } = await import('../../src/utils.ts');
      const restoreTty = setInteractive(false);
      try {
        await expect(configCommand({ ...baseOptions(), readOnly: false })).rejects.toSatisfy(
          (err: unknown) =>
            err instanceof CliError &&
            err.code === ERROR_CODES.READ_ONLY &&
            err.message.includes('needs an interactive terminal')
        );
      } finally {
        restoreTty();
      }
      expect(writeCredentialsFile).not.toHaveBeenCalled();
    });

    it('refuses --no-read-only while IPB_READ_ONLY is set, even in a terminal', async () => {
      process.env.IPB_READ_ONLY = '1';
      const restoreTty = setInteractive(true);
      try {
        await expect(configCommand({ ...baseOptions(), readOnly: false })).rejects.toThrow(
          /unset it to leave read-only mode/
        );
      } finally {
        restoreTty();
      }
      expect(mockPrompts.confirm).not.toHaveBeenCalled();
    });

    it('turns it off after confirmation in a terminal', async () => {
      const { writeCredentialsFile } = await import('../../src/utils.ts');
      mockState.cred = { ...mockState.cred, readOnly: 'true' } as typeof mockState.cred;
      mockPrompts.confirm.mockResolvedValueOnce(true);
      const restoreTty = setInteractive(true);
      try {
        await configCommand({ ...baseOptions(), readOnly: false });
      } finally {
        restoreTty();
      }

      expect(mockPrompts.confirm).toHaveBeenCalledWith(expect.objectContaining({ default: false }));
      expect(writeCredentialsFile).toHaveBeenCalledWith(
        '/tmp/.ipb/.credentials.json',
        expect.objectContaining({ readOnly: 'false' })
      );
      expect(console.log).toHaveBeenCalledWith('Read-only mode is off.');
    });

    it('leaves it on when the confirmation is declined', async () => {
      const { writeCredentialsFile } = await import('../../src/utils.ts');
      mockPrompts.confirm.mockResolvedValueOnce(false);
      const restoreTty = setInteractive(true);
      try {
        await configCommand({ ...baseOptions(), readOnly: false });
      } finally {
        restoreTty();
      }

      expect(writeCredentialsFile).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Read-only mode left on.');
    });

    it('warns when a profile is turned off but the default file still keeps it on', async () => {
      const { writeProfile } = await import('../../src/utils.ts');
      mockState.cred = { ...mockState.cred, readOnly: 'true' } as typeof mockState.cred;
      mockPrompts.confirm.mockResolvedValueOnce(true);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const restoreTty = setInteractive(true);
      try {
        await configCommand({ ...baseOptions(), profile: 'prod', readOnly: false });
      } finally {
        restoreTty();
      }

      expect(writeProfile).toHaveBeenCalledWith(
        'prod',
        expect.objectContaining({ readOnly: 'false' })
      );
      expect(String(warnSpy.mock.calls[0]?.[0])).toContain('Read-only mode is still on');
      warnSpy.mockRestore();
    });
  });
});
