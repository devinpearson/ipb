/// <reference types="vitest" />

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { uploadCommand } from '../../src/cmds/upload';
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
      text: '',
    })),
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
    validateFilePath: vi.fn(async (path) => {
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
  access: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {},
  promises: mockFsPromises,
}));

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  uploadCode: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('uploadCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockFsPromises.access.mockResolvedValue(undefined);
  });

  it('should upload code successfully', async () => {
    const options = {
      filename: 'test.js',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("upload test");';
    const mockResult = {
      data: {
        result: {
          codeId: 'code-456',
        },
      },
    };

    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadCode.mockResolvedValue(mockResult);

    await uploadCommand(options);

    const { resolve } = await import('node:path');
    const expectedPath = resolve('test.js');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(mockApi.uploadCode).toHaveBeenCalledWith('test-card-key', { code: mockCode });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('code uploaded with codeId: code-456'));
  });

  it('should throw CliError when file does not exist', async () => {
    const options = {
      filename: 'missing.js',
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

    await expect(uploadCommand(options)).rejects.toThrow(CliError);
    await expect(uploadCommand(options)).rejects.toThrow('does not exist');
    expect(mockApi.uploadCode).not.toHaveBeenCalled();
  });

  it('should use default card key when not provided', async () => {
    const options = {
      filename: 'test.js',
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
          codeId: 'code-789',
        },
      },
    };

    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockResolvedValue((await import('node:path')).resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadCode.mockResolvedValue(mockResult);

    await uploadCommand(options);

    expect(mockApi.uploadCode).toHaveBeenCalledWith('default-card-key', { code: mockCode });
  });

  it('should propagate API errors', async () => {
    const options = {
      filename: 'test.js',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("test");';
    const apiError = new Error('Upload failed');

    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockResolvedValue((await import('node:path')).resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadCode.mockRejectedValue(apiError);

    await expect(uploadCommand(options)).rejects.toThrow('Upload failed');
  });
});

