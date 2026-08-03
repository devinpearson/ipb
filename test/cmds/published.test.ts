/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishedCommand } from '../../src/cmds/published';

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentials: {
    host: 'https://openapi.investec.com',
    apiKey: 'k',
    clientId: 'c',
    clientSecret: 's',
    cardKey: '1',
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
  getPublishedCode: vi.fn(),
};

describe('publishedCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runWriteCommand.mockResolvedValue(undefined);
    (initializeApi as vi.Mock).mockResolvedValue(mockApi);
  });

  it('does not write when API returns empty code', async () => {
    mockApi.getPublishedCode.mockResolvedValue({
      data: { result: { code: '' } },
    });

    await publishedCommand({
      filename: 'out.js',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(runWriteCommand).not.toHaveBeenCalled();
  });

  it('writes published JavaScript to disk', async () => {
    mockApi.getPublishedCode.mockResolvedValue({
      data: { result: { code: 'export default {};' } },
    });

    await publishedCommand({
      filename: 'published.js',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      cardKey: 7,
    });

    expect(mockApi.getPublishedCode).toHaveBeenCalledWith('7');
    expect(runWriteCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: '/abs/published.js',
        content: 'export default {};',
      })
    );
  });
});
