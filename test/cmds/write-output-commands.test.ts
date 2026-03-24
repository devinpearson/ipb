/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import { envCommand } from '../../src/cmds/env';
import { logsCommand } from '../../src/cmds/logs';
import { publishedCommand } from '../../src/cmds/published';

vi.mock('../../src/index.ts', () => ({
  credentials: { cardKey: 'default-card-key' },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockState = vi.hoisted(() => ({
  isPiped: false,
  api: {
    getEnv: vi.fn(),
    getPublishedCode: vi.fn(),
    getExecutions: vi.fn(),
  },
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    isStdoutPiped: vi.fn(() => mockState.isPiped),
    initializeApi: vi.fn(async () => mockState.api),
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      text: '',
    })),
    resolveSpinnerState: vi.fn(() => ({ spinnerEnabled: true, verbose: false })),
    withSpinner: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
    validateFilePathForWrite: vi.fn(async (filename: string) => filename),
    runWriteCommand: vi.fn(async () => undefined),
  };
});

describe('write-output commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isPiped = false;
  });

  it('env command writes fetched variables to normalized file', async () => {
    mockState.api.getEnv.mockResolvedValue({
      data: { result: { variables: { A: '1', B: '2' } } },
    });

    const options = {
      filename: 'env.json',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    const { runWriteCommand } = await import('../../src/utils.ts');
    await envCommand(options);

    expect(runWriteCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'env.json',
        content: JSON.stringify({ A: '1', B: '2' }, null, 4),
      })
    );
  });

  it('published command writes code when API returns code', async () => {
    mockState.api.getPublishedCode.mockResolvedValue({
      data: { result: { code: 'console.log("published");' } },
    });

    const options = {
      filename: 'published.js',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    const { runWriteCommand } = await import('../../src/utils.ts');
    await publishedCommand(options);

    expect(runWriteCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'published.js',
        content: 'console.log("published");',
      })
    );
  });

  it('published command skips write when code is empty', async () => {
    mockState.api.getPublishedCode.mockResolvedValue({
      data: { result: { code: '' } },
    });

    const options = {
      filename: 'published.js',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    const { runWriteCommand } = await import('../../src/utils.ts');
    await publishedCommand(options);

    expect(runWriteCommand).not.toHaveBeenCalled();
  });

  it('logs command throws when filename is missing', async () => {
    const options = {
      filename: '',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    await expect(logsCommand(options)).rejects.toThrow(CliError);
    await expect(logsCommand(options)).rejects.toMatchObject({ code: ERROR_CODES.FILE_NOT_FOUND });
  });

  it('logs command writes serialized execution items', async () => {
    mockState.api.getExecutions.mockResolvedValue({
      data: {
        result: {
          executionItems: [{ type: 'INFO', logs: [{ level: 'info', content: 'ok' }] }],
        },
      },
    });

    const options = {
      filename: 'logs.json',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    const { runWriteCommand } = await import('../../src/utils.ts');
    await logsCommand(options);

    expect(runWriteCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'logs.json',
        content: JSON.stringify(
          [{ type: 'INFO', logs: [{ level: 'info', content: 'ok' }] }],
          null,
          4
        ),
      })
    );
  });
});
