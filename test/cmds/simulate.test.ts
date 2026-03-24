/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { simulateCommand } from '../../src/cmds/simulate';
import { CliError, ERROR_CODES } from '../../src/errors';

const mockCreateTransaction = vi.hoisted(() => vi.fn());

vi.mock('programmable-card-code-emulator', () => ({
  createTransaction: mockCreateTransaction,
}));

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
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
    validateFilePath: vi.fn(async (_path) => {
      const { resolve } = await import('node:path');
      return resolve('test.js');
    }),
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
const { validateFilePath } = await import('../../src/utils.ts');

const mockApi = {
  executeCode: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('simulateCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    (validateFilePath as vi.Mock).mockResolvedValue('/tmp/test.js');
    mockCreateTransaction.mockReturnValue({
      currencyCode: 'ZAR',
      centsAmount: 10000,
      merchant: {
        category: { code: '1234' },
        name: 'Test Merchant',
        city: 'Cape Town',
        country: { code: 'ZA' },
      },
    });
  });

  it('executes simulation successfully with explicit card key', async () => {
    const options = {
      filename: 'test.js',
      cardKey: 'test-card-key',
      currency: 'zar',
      amount: 10000,
      mcc: '1234',
      merchant: 'Test Merchant',
      city: 'Cape Town',
      country: 'ZA',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockFsPromises.readFile.mockResolvedValue('console.log("simulate");');
    mockApi.executeCode.mockResolvedValue({
      data: {
        result: [{ type: 'INFO', logs: [{ level: 'info', content: 'sim ok' }] }],
      },
    });

    await simulateCommand(options);

    expect(mockApi.executeCode).toHaveBeenCalledWith(
      'console.log("simulate");',
      expect.any(Object),
      'test-card-key'
    );
  });

  it('uses default card key when one is not provided', async () => {
    const options = {
      filename: 'test.js',
      currency: 'zar',
      amount: 10000,
      mcc: '1234',
      merchant: 'Test Merchant',
      city: 'Cape Town',
      country: 'ZA',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockFsPromises.readFile.mockResolvedValue('console.log("simulate");');
    mockApi.executeCode.mockResolvedValue({ data: { result: [] } });

    await simulateCommand(options);

    expect(mockApi.executeCode).toHaveBeenCalledWith(
      'console.log("simulate");',
      expect.any(Object),
      'default-card-key'
    );
  });

  it('throws when file validation fails', async () => {
    const options = {
      filename: 'missing.js',
      cardKey: 'test-card-key',
      currency: 'zar',
      amount: 10000,
      mcc: '1234',
      merchant: 'Test Merchant',
      city: 'Cape Town',
      country: 'ZA',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    (validateFilePath as vi.Mock).mockRejectedValue(
      new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File does not exist')
    );

    await expect(simulateCommand(options)).rejects.toThrow(CliError);
    expect(mockApi.executeCode).not.toHaveBeenCalled();
  });

  it('propagates API execution errors', async () => {
    const options = {
      filename: 'test.js',
      cardKey: 'test-card-key',
      currency: 'zar',
      amount: 10000,
      mcc: '1234',
      merchant: 'Test Merchant',
      city: 'Cape Town',
      country: 'ZA',
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockFsPromises.readFile.mockResolvedValue('console.log("simulate");');
    mockApi.executeCode.mockRejectedValue(new Error('Simulation failed'));

    await expect(simulateCommand(options)).rejects.toThrow('Simulation failed');
  });
});
