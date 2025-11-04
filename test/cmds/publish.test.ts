/// <reference types="vitest" />

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { publishCommand } from '../../src/cmds/publish';
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
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await publishCommand(options);

    expect(mockFsPromises.access).toHaveBeenCalledWith('test.js');
    expect(mockFsPromises.readFile).toHaveBeenCalledWith('test.js', 'utf8');
    expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith('test-card-key', 'code-123', mockCode);
    expect(console.log).toHaveBeenCalledWith('🎉 code published with codeId: code-123');
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

    mockFsPromises.access.mockRejectedValue(new Error('File not found'));

    await expect(publishCommand(options)).rejects.toThrow(CliError);
    await expect(publishCommand(options)).rejects.toThrow('File does not exist');
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

    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockApi.uploadPublishedCode.mockResolvedValue(mockResult);

    await publishCommand(options);

    expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith('default-card-key', 'code-456', mockCode);
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

    mockFsPromises.readFile.mockResolvedValue(mockCode);
    mockApi.uploadPublishedCode.mockRejectedValue(apiError);

    await expect(publishCommand(options)).rejects.toThrow('Publish failed');
  });
});

