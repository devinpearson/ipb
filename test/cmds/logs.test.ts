/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logsCommand } from '../../src/cmds/logs';
import { CliError } from '../../src/errors';

vi.mock('../../src/index.ts', () => ({
  credentials: {
    host: 'https://openapi.investec.com',
    apiKey: 'k',
    clientId: 'c',
    clientSecret: 's',
    cardKey: '99',
    openaiKey: '',
    sandboxKey: '',
  },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const runWriteCommand = vi.hoisted(() => vi.fn());

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializeApi: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
    })),
    withSpinner: vi.fn(async (_s, _e, fn: () => Promise<unknown>) => await fn()),
    normalizeCardKey: vi.fn((key: string | number | undefined, def: string) =>
      key !== undefined && key !== '' ? String(key) : def
    ),
    validateFilePathForWrite: vi.fn(async (filename: string) => `/abs/${filename}`),
    runWriteCommand,
  };
});

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  getExecutions: vi.fn(),
};

describe('logsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runWriteCommand.mockResolvedValue(undefined);
    (initializeApi as vi.Mock).mockResolvedValue(mockApi);
    mockApi.getExecutions.mockResolvedValue({
      data: {
        result: {
          executionItems: [
            { id: '1', status: 'ok' },
            { id: '2', status: 'ok' },
          ],
        },
      },
    });
  });

  it('throws when filename is missing', async () => {
    await expect(
      logsCommand({
        filename: '',
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
        cardKey: 99,
      })
    ).rejects.toThrow(CliError);
  });

  it('fetches executions and writes formatted JSON via runWriteCommand', async () => {
    await logsCommand({
      filename: 'out.json',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      cardKey: 42,
    });

    expect(initializeApi).toHaveBeenCalled();
    expect(mockApi.getExecutions).toHaveBeenCalledWith('42');
    expect(runWriteCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: '/abs/out.json',
        content: expect.stringContaining('"id": "1"'),
      })
    );
  });

  it('writes empty array when API returns no execution items', async () => {
    mockApi.getExecutions.mockResolvedValueOnce({
      data: { result: { executionItems: undefined } },
    });

    await logsCommand({
      filename: 'logs.json',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(runWriteCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '[]',
      })
    );
  });
});
