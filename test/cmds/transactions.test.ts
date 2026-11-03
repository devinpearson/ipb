/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transactionsCommand } from '../../src/cmds/transactions';

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentials: {},
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializePbApi: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
    })),
    formatOutput: vi.fn(),
    runListCommand: vi.fn(),
    printTable: vi.fn(),
  };
});

const { initializePbApi } = await import('../../src/utils.ts');

const mockApi = {
  getAccountTransactions: vi.fn(),
};

(initializePbApi as vi.Mock).mockResolvedValue(mockApi);

const baseOptions = {
  host: 'test-host',
  apiKey: 'test-api-key',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  credentialsFile: 'test-credentials-file',
  verbose: false,
};

describe('transactionsCommand', () => {
  beforeEach(() => {
    mockApi.getAccountTransactions.mockReset();
  });

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
        amount: 100.0,
        description: 'Test transaction',
        date: '2024-01-01',
      },
    ];

    mockApi.getAccountTransactions.mockResolvedValue({ data: { transactions: mockTransactions } });

    console.log = vi.fn();
    const { runListCommand } = await import('../../src/utils.ts');

    await transactionsCommand('acc-123', options);

    expect(mockApi.getAccountTransactions).toHaveBeenCalledWith('acc-123', null, null, null);
    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: mockTransactions,
      })
    );
  });

  it('passes --from, --to and --type through to the API', async () => {
    mockApi.getAccountTransactions.mockResolvedValue({ data: { transactions: [] } });
    console.log = vi.fn();

    await transactionsCommand('acc-123', {
      ...baseOptions,
      from: '2026-10-01',
      to: ' 2026-10-31 ',
      type: 'CardPurchases',
    });

    expect(mockApi.getAccountTransactions).toHaveBeenCalledWith(
      'acc-123',
      '2026-10-01',
      '2026-10-31',
      'CardPurchases'
    );
  });

  it('allows only one end of the date range', async () => {
    mockApi.getAccountTransactions.mockResolvedValue({ data: { transactions: [] } });
    console.log = vi.fn();

    await transactionsCommand('acc-123', { ...baseOptions, from: '2026-10-01' });

    expect(mockApi.getAccountTransactions).toHaveBeenCalledWith(
      'acc-123',
      '2026-10-01',
      null,
      null
    );
  });

  it('rejects malformed dates and reversed ranges before calling the API', async () => {
    await expect(
      transactionsCommand('acc-123', { ...baseOptions, from: '01/10/2026' })
    ).rejects.toThrow(/--from must be a date in YYYY-MM-DD format/);
    await expect(
      transactionsCommand('acc-123', { ...baseOptions, from: '2026-10-31', to: '2026-10-01' })
    ).rejects.toThrow(/must be on or before --to/);
    expect(mockApi.getAccountTransactions).not.toHaveBeenCalled();
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

    await expect(transactionsCommand('acc-123', options)).rejects.toThrow(
      'Failed to fetch transactions'
    );
  });
});
