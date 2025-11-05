/// <reference types="vitest" />

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { deployCommand } from '../../src/cmds/deploy';
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
    confirmDestructiveOperation: vi.fn(async () => true),
    formatFileSize: vi.fn((bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }),
    getFileSize: vi.fn(async (path) => {
      // Mock file size - return size based on path
      return 1024; // 1 KB
    }),
    withRetry: vi.fn(async (fn) => fn()),
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

vi.mock('dotenv', () => ({
  default: {
    parse: vi.fn((content: string) => {
      const env: Record<string, string> = {};
      content.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });
      return env;
    }),
  },
}));

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  uploadCode: vi.fn(),
  uploadEnv: vi.fn(),
  uploadPublishedCode: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('deployCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockFsPromises.access.mockResolvedValue(undefined);
  });

  it('should deploy code successfully without env file', async () => {
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
    const mockResult = {
      data: {
        result: {
          codeId: 'code-123',
        },
      },
    };

    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadCode.mockResolvedValue(mockResult);
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await deployCommand(options);

    const { resolve } = await import('node:path');
    const expectedPath = resolve('test.js');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(mockApi.uploadCode).toHaveBeenCalledWith('test-card-key', { code: mockCode });
    expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith('test-card-key', 'code-123', mockCode);
    expect(console.log).toHaveBeenCalledWith('🎉 code deployed with codeId: code-123');
  });

  it('should deploy code with env file', async () => {
    const options = {
      filename: 'test.js',
      env: 'production',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCode = 'console.log("test");';
    const mockEnvContent = 'API_KEY=test123\nSECRET=secret456';
    const mockResult = {
      data: {
        result: {
          codeId: 'code-123',
        },
      },
    };

    const { validateFilePath } = await import('../../src/utils.ts');
    const { resolve } = await import('node:path');
    (validateFilePath as vi.Mock)
      .mockResolvedValueOnce(resolve('.env.production')) // For env file
      .mockResolvedValueOnce(resolve('test.js')); // For code file
    mockFsPromises.readFile
      .mockResolvedValueOnce(mockEnvContent)
      .mockResolvedValueOnce(mockCode);
    mockFsPromises.stat
      .mockResolvedValueOnce({ size: Buffer.byteLength(mockEnvContent, 'utf8') })
      .mockResolvedValueOnce({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadEnv.mockResolvedValue({});
    mockApi.uploadCode.mockResolvedValue(mockResult);
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await deployCommand(options);

    const expectedEnvPath = resolve('.env.production'); // Normalized path
    const expectedCodePath = resolve('test.js');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(expectedEnvPath, 'utf8');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(expectedCodePath, 'utf8');
    expect(mockApi.uploadEnv).toHaveBeenCalledWith('test-card-key', {
      variables: { API_KEY: 'test123', SECRET: 'secret456' },
    });
    expect(mockApi.uploadCode).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('🎉 code deployed with codeId: code-123');
  });

  it('should throw CliError when env file does not exist', async () => {
    const options = {
      filename: 'test.js',
      env: 'missing',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const { validateFilePath, confirmDestructiveOperation } = await import('../../src/utils.ts');
    const { resolve } = await import('node:path');
    (confirmDestructiveOperation as vi.Mock).mockResolvedValue(true);
    (validateFilePath as vi.Mock)
      .mockResolvedValueOnce(resolve('test.js')) // First call for test.js succeeds
      .mockRejectedValueOnce( // Second call for .env.missing fails
        new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist')
      );

    const error = await deployCommand(options).catch((e) => e);
    expect(error).toBeInstanceOf(CliError);
    expect(error.message).toContain('Env file');
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
          codeId: 'code-123',
        },
      },
    };

    const { validateFilePath, confirmDestructiveOperation } = await import('../../src/utils.ts');
    (confirmDestructiveOperation as vi.Mock).mockResolvedValue(true);
    (validateFilePath as vi.Mock).mockResolvedValue((await import('node:path')).resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadCode.mockResolvedValue(mockResult);
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await deployCommand(options);

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

    const { confirmDestructiveOperation } = await import('../../src/utils.ts');
    (confirmDestructiveOperation as vi.Mock).mockResolvedValue(true);
    const mockCode = 'console.log("test");';
    const apiError = new Error('API connection failed');

    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockResolvedValue((await import('node:path')).resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockFsPromises.stat.mockResolvedValue({ size: Buffer.byteLength(mockCode, 'utf8') });
    mockApi.uploadCode.mockRejectedValue(apiError);

    await expect(deployCommand(options)).rejects.toThrow('API connection failed');
  });
});
