/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { transactionsCommand } from '../../src/cmds/transactions';

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
    formatOutput: vi.fn(),
    printTable: vi.fn(),
  };
});

const { initializePbApi } = await import('../../src/utils.ts');

const mockApi = {
  getAccountTransactions: vi.fn(),
};

(initializePbApi as vi.Mock).mockResolvedValue(mockApi);

describe('transactionsCommand', () => {
  it('should fetch and display transactions correctly', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockTransactions = [
      {
        transactionId: 'txn-1',
        amount: 100.00,
        description: 'Test transaction',
        date: '2024-01-01',
      },
    ];

    mockApi.getAccountTransactions.mockResolvedValue({ data: { transactions: mockTransactions } });

    console.log = vi.fn();
    const { formatOutput } = await import('../../src/utils.ts');

    await transactionsCommand('acc-123', options);

    expect(mockApi.getAccountTransactions).toHaveBeenCalledWith('acc-123');
    expect(formatOutput).toHaveBeenCalled();
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

    const error = new Error('Failed to fetch transactions');
    mockApi.getAccountTransactions.mockRejectedValue(error);

    await expect(transactionsCommand('acc-123', options)).rejects.toThrow('Failed to fetch transactions');
  });
});

