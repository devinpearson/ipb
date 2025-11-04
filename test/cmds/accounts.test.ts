/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { accountsCommand } from '../../src/cmds/accounts';

vi.mock('../../src/index.ts', () => ({
  credentials: {},
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializePbApi: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function() { return this; }),
      stop: vi.fn(),
    })),
    printTable: vi.fn(),
  };
});

const { initializePbApi } = await import('../../src/utils.ts');

const mockApi = {
  getAccounts: vi.fn(),
};

(initializePbApi as vi.Mock).mockResolvedValue(mockApi);

describe('accountsCommand', () => {
  it('should fetch and display accounts correctly', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockAccounts = [
      {
        accountId: 'acc-123',
        accountNumber: '1234567890',
        accountName: 'Test Account',
        productName: 'Private Banking',
      },
    ];

    mockApi.getAccounts.mockResolvedValue({ data: { accounts: mockAccounts } });

    console.log = vi.fn();
    const { printTable } = await import('../../src/utils.ts');

    await accountsCommand(options);

    expect(printTable).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it('should handle JSON output option', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
      json: true,
    };

    const mockAccounts = [
      {
        accountId: 'acc-123',
        accountNumber: '1234567890',
        accountName: 'Test Account',
      },
    ];

    mockApi.getAccounts.mockResolvedValue({ data: { accounts: mockAccounts } });

    console.log = vi.fn();

    await accountsCommand(options);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockAccounts, null, 2));
  });

  it('should propagate errors', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const error = new Error('API error');
    mockApi.getAccounts.mockRejectedValue(error);

    await expect(accountsCommand(options)).rejects.toThrow('API error');
  });
});

