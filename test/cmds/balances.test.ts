/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { balancesCommand } from '../../src/cmds/balances';

vi.mock('../../src/index.ts', () => ({
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
    isStdoutPiped: vi.fn(() => false), // Mock as not piped for tests
    readStdin: vi.fn(async () => null),
  };
});

const { initializePbApi } = await import('../../src/utils.ts');

const mockApi = {
  getAccountBalances: vi.fn(),
};

(initializePbApi as vi.Mock).mockResolvedValue(mockApi);

describe('balancesCommand', () => {
  it('should fetch and display account balance correctly', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockBalance = {
      accountId: 'acc-123',
      currentBalance: 1000.5,
      availableBalance: 950.0,
      currency: 'ZAR',
    };

    mockApi.getAccountBalances.mockResolvedValue({ data: mockBalance });

    console.log = vi.fn();

    await balancesCommand('acc-123', options);

    expect(mockApi.getAccountBalances).toHaveBeenCalledWith('acc-123');
    expect(console.log).toHaveBeenCalled();
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

    const error = new Error('Account not found');
    mockApi.getAccountBalances.mockRejectedValue(error);

    await expect(balancesCommand('invalid-account', options)).rejects.toThrow('Account not found');
  });
});
