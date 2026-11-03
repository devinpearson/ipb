/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployCommand } from '../../src/cmds/deploy';
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
      update: vi.fn(),
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
  getEnv: vi.fn(),
};

const previousEnvResponse = { data: { result: { variables: { OLD: 'value' } } } };

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('deployCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockFsPromises.access.mockResolvedValue(undefined);
    delete process.env.IPB_READ_ONLY;
    mockApi.getEnv.mockResolvedValue(previousEnvResponse);
  });

  it('is blocked in read-only mode before reading files or calling the API', async () => {
    process.env.IPB_READ_ONLY = '1';

    await expect(
      deployCommand({ filename: 'test.js', cardKey: 'k', yes: true } as never)
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.READ_ONLY
    );
    expect(mockFsPromises.readFile).not.toHaveBeenCalled();
    expect(mockApi.uploadCode).not.toHaveBeenCalled();
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
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('code deployed with codeId: code-123')
    );
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
      .mockResolvedValueOnce(resolve('test.js')) // code file is checked first
      .mockResolvedValueOnce(resolve('.env.production'));
    mockFsPromises.readFile.mockResolvedValueOnce(mockEnvContent).mockResolvedValueOnce(mockCode);
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
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('code deployed with codeId: code-123')
    );
  });

  describe('with an env file', () => {
    const envOptions = {
      filename: 'test.js',
      env: 'production',
      cardKey: 'test-card-key',
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };
    const saved = { data: { result: { codeId: 'code-9' } } };

    beforeEach(async () => {
      const { validateFilePath } = await import('../../src/utils.ts');
      const { resolve } = await import('node:path');
      (validateFilePath as vi.Mock)
        .mockResolvedValueOnce(resolve('test.js'))
        .mockResolvedValueOnce(resolve('.env.production'));
      mockFsPromises.readFile
        .mockResolvedValueOnce('NEW=value')
        .mockResolvedValueOnce('console.log(1);');
      mockApi.uploadCode.mockResolvedValue(saved);
      mockApi.uploadEnv.mockResolvedValue({});
    });

    it('saves code, records the old env, uploads the new env, then publishes', async () => {
      mockApi.uploadPublishedCode.mockResolvedValue(saved);

      await deployCommand(envOptions);

      const order = (fn: vi.Mock) => fn.mock.invocationCallOrder[0] ?? 0;
      expect(order(mockApi.uploadCode)).toBeLessThan(order(mockApi.getEnv));
      expect(order(mockApi.getEnv)).toBeLessThan(order(mockApi.uploadEnv));
      expect(order(mockApi.uploadEnv)).toBeLessThan(order(mockApi.uploadPublishedCode));
      expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith(
        'test-card-key',
        'code-9',
        'console.log(1);'
      );
    });

    it('restores the previous env when publishing fails', async () => {
      mockApi.uploadPublishedCode.mockRejectedValue(new Error('publish exploded'));

      const error = await deployCommand(envOptions).catch((e) => e);

      expect(mockApi.uploadEnv).toHaveBeenNthCalledWith(1, 'test-card-key', {
        variables: { NEW: 'value' },
      });
      expect(mockApi.uploadEnv).toHaveBeenNthCalledWith(2, 'test-card-key', {
        variables: { OLD: 'value' },
      });
      expect(error).toBeInstanceOf(CliError);
      expect(error.code).toBe(ERROR_CODES.DEPLOY_FAILED);
      expect(error.message).toContain('previous environment variables were restored');
      expect(error.message).toContain('publish exploded');
    });

    it('says so when restoring the env also fails', async () => {
      mockApi.uploadPublishedCode.mockRejectedValue(new Error('publish exploded'));
      mockApi.uploadEnv
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('restore failed'));

      const error = await deployCommand(envOptions).catch((e) => e);

      expect(error.code).toBe(ERROR_CODES.DEPLOY_FAILED);
      expect(error.message).toContain('could not be restored');
      expect(error.message).toContain('ipb upload-env');
      expect(error.message).toContain('restore failed');
    });

    it('does not touch the env if saving the code fails', async () => {
      mockApi.uploadCode.mockRejectedValue(new Error('save failed'));

      await expect(deployCommand(envOptions)).rejects.toThrow('save failed');
      expect(mockApi.getEnv).not.toHaveBeenCalled();
      expect(mockApi.uploadEnv).not.toHaveBeenCalled();
    });
  });

  it('rethrows a publish failure unchanged when no env was uploaded', async () => {
    const { resolve } = await import('node:path');
    const { validateFilePath } = await import('../../src/utils.ts');
    (validateFilePath as vi.Mock).mockResolvedValueOnce(resolve('test.js'));
    mockFsPromises.readFile.mockResolvedValueOnce('x');
    mockApi.uploadCode.mockResolvedValue({ data: { result: { codeId: 'c1' } } });
    const publishError = new Error('publish exploded');
    mockApi.uploadPublishedCode.mockRejectedValue(publishError);

    await expect(
      deployCommand({ filename: 'test.js', cardKey: 'k', verbose: false } as never)
    ).rejects.toBe(publishError);
    expect(mockApi.getEnv).not.toHaveBeenCalled();
    expect(mockApi.uploadEnv).not.toHaveBeenCalled();
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
      .mockRejectedValueOnce(
        // Second call for .env.missing fails
        new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist')
      );

    const error = await deployCommand(options).catch((e) => e);
    expect(error).toBeInstanceOf(CliError);
    expect(error.message).toContain('Env file');
    expect(initializeApi).not.toHaveBeenCalled();
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

  describe('exact calls', () => {
    const utils = () => import('../../src/utils.ts');
    const okUpload = { data: { result: { codeId: 'code-1' } } };
    const base = { filename: 'main.js', cardKey: 42, verbose: true, yes: true } as never;

    it('stops without touching the card when the user cancels', async () => {
      const { confirmDestructiveOperation } = await utils();
      (confirmDestructiveOperation as vi.Mock).mockResolvedValueOnce(false);

      await deployCommand(base);

      expect(console.log).toHaveBeenCalledWith('Deployment cancelled.');
      expect(initializeApi).not.toHaveBeenCalled();
      expect(mockFsPromises.readFile).not.toHaveBeenCalled();
    });

    it('checks the file, asks before overwriting and names the command when read-only', async () => {
      const { validateFilePath, confirmDestructiveOperation } = await utils();
      mockApi.uploadCode.mockResolvedValue(okUpload);
      mockFsPromises.readFile.mockResolvedValue('code');

      await deployCommand(base);

      expect(validateFilePath).toHaveBeenCalledWith('main.js', ['.js']);
      expect(confirmDestructiveOperation).toHaveBeenCalledWith(
        'This will deploy code to card 42 and overwrite any existing code. Continue?',
        { yes: true }
      );

      process.env.IPB_READ_ONLY = '1';
      await expect(deployCommand(base)).rejects.toThrow(/ipb deploy is blocked/);
    });

    it('sends the code, env and publish calls with retries and reports progress', async () => {
      const { withRetry, createSpinner } = await utils();
      mockApi.uploadCode.mockResolvedValue(okUpload);
      mockApi.uploadEnv.mockResolvedValue({});
      mockApi.uploadPublishedCode.mockResolvedValue({});
      mockFsPromises.readFile.mockResolvedValueOnce('A=1').mockResolvedValueOnce('let x;');

      await deployCommand({ ...(base as object), env: 'prod' } as never);

      const { validateFilePath } = await utils();
      expect(validateFilePath).toHaveBeenCalledWith('.env.prod');
      expect(mockApi.uploadCode).toHaveBeenCalledWith(42, { code: 'let x;' });
      expect(mockApi.getEnv).toHaveBeenCalledWith(42);
      expect(mockApi.uploadEnv).toHaveBeenCalledWith(42, { variables: { A: '1' } });
      expect(mockApi.uploadPublishedCode).toHaveBeenCalledWith(42, 'code-1', 'let x;');
      for (const call of (withRetry as vi.Mock).mock.calls) {
        expect(call[1]).toEqual({ verbose: true });
      }
      expect(createSpinner).toHaveBeenCalledWith(expect.any(Boolean), '💳 starting deployment...');
      const spinner = (createSpinner as vi.Mock).mock.results.at(-1)?.value;
      expect(spinner.update.mock.calls.map((c: string[]) => c[0])).toEqual([
        expect.stringMatching(/^🚀 reading code from .+ \(1\.0 KB\)\.\.\.$/),
        '🚀 saving code (6 B)...',
        '📦 uploading env from .env.prod...',
        '🚀 publishing code...',
      ]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('code deployed with codeId: code-1')
      );
    });

    it('restores an empty env when the card had no variables before', async () => {
      mockApi.uploadCode.mockResolvedValue(okUpload);
      mockApi.getEnv.mockResolvedValue({ data: { result: {} } });
      mockApi.uploadEnv.mockResolvedValue({});
      mockApi.uploadPublishedCode.mockRejectedValue(new Error('publish down'));
      mockFsPromises.readFile.mockResolvedValueOnce('A=1').mockResolvedValueOnce('code');

      await expect(deployCommand({ ...(base as object), env: 'prod' } as never)).rejects.toThrow(
        /previous environment variables were restored/
      );
      expect(mockApi.uploadEnv).toHaveBeenLastCalledWith(42, { variables: {} });
    });

    it('does not report success when the API returns no code id', async () => {
      mockApi.uploadCode.mockResolvedValue({ data: { result: {} } });
      mockApi.uploadPublishedCode.mockResolvedValue({});
      mockFsPromises.readFile.mockResolvedValue('code');

      await deployCommand(base);

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('code deployed'));
    });

    it.each([
      ['a different CliError', new CliError(ERROR_CODES.PERMISSION_DENIED, 'no access')],
      ['a plain error', new Error('disk on fire')],
    ])('passes %s from the env file through unchanged', async (_label, failure) => {
      const { validateFilePath } = await utils();
      (validateFilePath as vi.Mock)
        .mockResolvedValueOnce('/abs/main.js')
        .mockRejectedValueOnce(failure);

      await expect(deployCommand({ ...(base as object), env: 'prod' } as never)).rejects.toBe(
        failure
      );
      expect(mockApi.uploadCode).not.toHaveBeenCalled();
    });
  });
});
