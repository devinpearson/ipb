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
    })),
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
  };
});

const mockFsPromises = vi.hoisted(() => ({
  access: vi.fn(),
  readFile: vi.fn(),
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
    mockApi.uploadCode.mockResolvedValue(mockResult);

    await uploadCommand(options);

    expect(mockFsPromises.access).toHaveBeenCalledWith('test.js');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith('test.js', 'utf8');
    expect(mockApi.uploadCode).toHaveBeenCalledWith('test-card-key', { code: mockCode });
    expect(console.log).toHaveBeenCalledWith('🎉 code uploaded with codeId: code-456');
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

    mockFsPromises.access.mockRejectedValue(new Error('File not found'));

    await expect(uploadCommand(options)).rejects.toThrow(CliError);
    await expect(uploadCommand(options)).rejects.toThrow('File does not exist');
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

    mockFsPromises.readFile.mockResolvedValue(mockCode);
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

    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockApi.uploadCode.mockRejectedValue(apiError);

    await expect(uploadCommand(options)).rejects.toThrow('Upload failed');
  });
});

