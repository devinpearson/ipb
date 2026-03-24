/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadEnvCommand } from '../../src/cmds/upload-env';
import { CliError, ERROR_CODES } from '../../src/errors';

vi.mock('../../src/index.ts', () => ({
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
      const { resolve } = await import('node:path');
      return resolve('env.json');
    }),
    resolveSpinnerState: vi.fn(() => ({ spinnerEnabled: true, verbose: false })),
    withSpinnerOutcome: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
    isStdoutPiped: vi.fn(() => false),
  };
});

const mockFsPromises = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { promises: mockFsPromises },
  promises: mockFsPromises,
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockFsPromises.readFile,
}));

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  uploadEnv: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('uploadEnvCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockFsPromises.readFile.mockReset();
  });

  it('uploads parsed environment variables', async () => {
    const options = {
      filename: 'env.json',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockFsPromises.readFile.mockResolvedValue(
      '{"NODE_ENV":"prod","API_URL":"https://example.test"}'
    );
    mockApi.uploadEnv.mockResolvedValue({ data: { ok: true } });

    await uploadEnvCommand(options);

    expect(mockApi.uploadEnv).toHaveBeenCalledWith('test-card-key', {
      variables: {
        NODE_ENV: 'prod',
        API_URL: 'https://example.test',
      },
    });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('env uploaded'));
  });

  it('uses default card key when card key is not provided', async () => {
    const options = {
      filename: 'env.json',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockFsPromises.readFile.mockResolvedValue('{"FEATURE_FLAG":"on"}');
    mockApi.uploadEnv.mockResolvedValue({ data: { ok: true } });

    await uploadEnvCommand(options);

    expect(mockApi.uploadEnv).toHaveBeenCalledWith('default-card-key', {
      variables: { FEATURE_FLAG: 'on' },
    });
  });

  it('throws when file validation fails', async () => {
    const options = {
      filename: 'missing.json',
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

    await expect(uploadEnvCommand(options)).rejects.toThrow(CliError);
    expect(mockApi.uploadEnv).not.toHaveBeenCalled();
  });

  it('propagates JSON parse errors for malformed files', async () => {
    const options = {
      filename: 'env.json',
      cardKey: 'test-card-key',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockFsPromises.readFile.mockResolvedValue('{invalid-json');

    await expect(uploadEnvCommand(options)).rejects.toThrow();
    expect(mockApi.uploadEnv).not.toHaveBeenCalled();
  });
});
