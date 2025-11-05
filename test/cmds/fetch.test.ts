/// <reference types="vitest" />

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchCommand } from '../../src/cmds/fetch';
import { CliError, ERROR_CODES } from '../../src/errors';

vi.mock('../../src/index.ts', () => ({
  credentials: { cardKey: 'default-card-key' },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializeApi: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function() { return this; }),
      stop: vi.fn(),
    })),
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
    validateFilePathForWrite: vi.fn(async (path) => {
      // Return absolute path for testing
      const { resolve } = await import('node:path');
      return resolve(path);
    }),
    formatFileSize: vi.fn((bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }),
    getFileSize: vi.fn(async (path) => {
      // Mock file size - return size based on path
      return 1024; // 1 KB
    }),
    getTerminalCapabilities: vi.fn(() => ({
      supportsUnicode: true,
      supportsEmoji: true,
      termType: 'xterm-256color',
    })),
  };
});

const mockFsPromises = vi.hoisted(() => ({
  writeFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {},
  promises: mockFsPromises,
}));

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  getSavedCode: vi.fn(),
};

describe('fetchCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    (initializeApi as vi.Mock).mockResolvedValue(mockApi);
  });

  it('should fetch and save code successfully', async () => {
    const options = {
      filename: 'fetched.js',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("fetched code");';
    const mockResult = {
      data: {
        result: {
          code: mockCode,
        },
      },
    };

    mockApi.getSavedCode.mockResolvedValue(mockResult);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });

    await fetchCommand(options);

    expect(mockApi.getSavedCode).toHaveBeenCalledWith('test-card-key');
    const { resolve } = await import('node:path');
    const expectedPath = resolve('fetched.js');
    expect(mockFsPromises.writeFile).toHaveBeenCalledWith(expectedPath, mockCode, 'utf8');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('code saved to file'));
  });

  it('should throw CliError when API does not support getSavedCode', async () => {
    const options = {
      filename: 'fetched.js',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const apiWithoutMethod = {};
    (initializeApi as vi.Mock).mockResolvedValue(apiWithoutMethod);

    await expect(fetchCommand(options)).rejects.toThrow(CliError);
    await expect(fetchCommand(options)).rejects.toThrow(
      'API client does not support fetching saved code'
    );
  });

  it('should throw CliError when API response is invalid', async () => {
    const options = {
      filename: 'fetched.js',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    (initializeApi as vi.Mock).mockResolvedValue(mockApi);
    mockApi.getSavedCode.mockResolvedValue({ data: {} });

    await expect(fetchCommand(options)).rejects.toThrow(CliError);
    await expect(fetchCommand(options)).rejects.toThrow('Unexpected API response');
  });

  it('should use default card key when not provided', async () => {
    const options = {
      filename: 'fetched.js',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("fetched code");';
    const mockResult = {
      data: {
        result: {
          code: mockCode,
        },
      },
    };

    mockApi.getSavedCode.mockResolvedValue(mockResult);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });

    await fetchCommand(options);

    expect(mockApi.getSavedCode).toHaveBeenCalledWith('default-card-key');
  });

  it('should propagate file write errors', async () => {
    const options = {
      filename: 'fetched.js',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("fetched code");';
    const mockResult = {
      data: {
        result: {
          code: mockCode,
        },
      },
    };

    const writeError = new Error('Permission denied');
    mockApi.getSavedCode.mockResolvedValue(mockResult);
    mockFsPromises.writeFile.mockRejectedValue(writeError);

    await expect(fetchCommand(options)).rejects.toThrow('Permission denied');
  });
});

