/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishCommand } from '../../src/cmds/publish';
import { CliError, ERROR_CODES } from '../../src/errors';

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentials: { cardKey: 'default-card-key' },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

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
      text: '',
    })),
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
    validateFilePath: vi.fn(async (_path) => {
      // Return absolute path for testing
      const { resolve } = await import('node:path');
      return resolve('test.js');
    }),
    confirmDestructiveOperation: vi.fn(async () => true),
    formatFileSize: vi.fn((bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }),
    getFileSize: vi.fn(async (_path) => {
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
  access: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { promises: mockFsPromises },
  promises: mockFsPromises,
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockFsPromises.readFile,
  stat: mockFsPromises.stat,
}));

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  uploadPublishedCode: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('publishCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockFsPromises.access.mockResolvedValue(undefined);
  });

  it('should publish code successfully', async () => {
    const options = {
      filename: 'test.js',
      codeId: 'code-123',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("publish test");';
    const mockResult = {
      data: {
        result: {
          codeId: 'code-123',
        },
      },
    };

    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await publishCommand(options);

    const { resolve } = await import('node:path');
    const expectedPath = resolve('test.js');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith('test-card-key', 'code-123', mockCode);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('code published with codeId: code-123')
    );
  });

  it('should throw CliError when file does not exist', async () => {
    const options = {
      filename: 'missing.js',
      codeId: 'code-123',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockRejectedValue(
      new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist')
    );

    await expect(publishCommand(options)).rejects.toThrow(CliError);
    await expect(publishCommand(options)).rejects.toThrow('does not exist');
    expect(mockApi.uploadPublishedCode).not.toHaveBeenCalled();
  });

  it('should use default card key when not provided', async () => {
    const options = {
      filename: 'test.js',
      codeId: 'code-456',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("test");';
    const mockResult = {
      data: {
        result: {
          codeId: 'code-456',
        },
      },
    };

    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockResolvedValue((await import('node:path')).resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await publishCommand(options);

    expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith(
      'default-card-key',
      'code-456',
      mockCode
    );
  });

  it('should propagate API errors', async () => {
    const options = {
      filename: 'test.js',
      codeId: 'code-123',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("test");';
    const apiError = new Error('Publish failed');

    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockResolvedValue((await import('node:path')).resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadPublishedCode.mockRejectedValue(apiError);

    await expect(publishCommand(options)).rejects.toThrow('Publish failed');
  });
});
