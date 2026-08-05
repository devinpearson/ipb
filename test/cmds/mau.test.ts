/// <reference types="vitest" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mauAccountsCommand } from '../../src/cmds/mau/accounts';
import { mauBalancesCommand } from '../../src/cmds/mau/balances';
import { mauDocumentsCommand } from '../../src/cmds/mau/documents';
import { mauStatementCommand } from '../../src/cmds/mau/statement';
import { mauTransactionsCommand } from '../../src/cmds/mau/transactions';
import { CliError, ERROR_CODES } from '../../src/errors';

vi.mock('../../src/runtime-credentials.ts', async () => {
  const { getRuntimeCredentialsMock } = await import('../helpers/cli-mocks.js');
  return getRuntimeCredentialsMock();
});

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializeMauApi: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
    })),
    formatOutput: vi.fn(),
    runListCommand: vi.fn(),
    printTable: vi.fn(),
    validateFilePathForWrite: vi.fn(async (p: string) => p),
  };
});

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    writeFile: vi.fn(async () => undefined),
  };
});

const { initializeMauApi, runListCommand } = await import('../../src/utils.ts');
const { writeFile } = await import('node:fs/promises');

const mockApi = {
  getAccounts: vi.fn(),
  getAccountBalances: vi.fn(),
  getAccountTransactions: vi.fn(),
  getAccountDocuments: vi.fn(),
  downloadAccountStatement: vi.fn(),
};

(initializeMauApi as vi.Mock).mockResolvedValue(mockApi);

const baseOptions = {
  verbose: false,
};

describe('mau commands', () => {
  let consoleLogSpy: { mockRestore: () => void } | undefined;

  afterEach(() => {
    vi.clearAllMocks();
    (initializeMauApi as vi.Mock).mockResolvedValue(mockApi);
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
      consoleLogSpy = undefined;
    }
  });

  it('mauAccountsCommand lists accounts', async () => {
    const accounts = [
      {
        accountId: 5331,
        accountNumber: '10101010101',
        accountName: 'USD',
        accountCurrency: 'USD',
        profileId: 1,
        profileName: 'Mock',
      },
    ];
    mockApi.getAccounts.mockResolvedValue({ data: { accounts } });

    await mauAccountsCommand(baseOptions);

    expect(initializeMauApi).toHaveBeenCalled();
    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: accounts,
      })
    );
  });

  it('mauBalancesCommand fetches balances for a numeric account id', async () => {
    mockApi.getAccountBalances.mockResolvedValue({
      data: {
        accountNumber: '5331',
        accountType: 'CALL DEPOSIT',
        accountShortName: 'Mock',
        balance: 100,
        availableBalance: 90,
        encumbrances: 10,
        currency: 'USD',
        debitInterestRate: 0,
        creditInterestRate: 1,
        creditInterestAccrued: 0,
        debitInterestAccrued: 0,
      },
    });

    await mauBalancesCommand('5331', baseOptions);

    expect(mockApi.getAccountBalances).toHaveBeenCalledWith('5331');
    expect(runListCommand).toHaveBeenCalled();
  });

  it('mauBalancesCommand rejects non-numeric account ids', async () => {
    await expect(mauBalancesCommand('acc-123', baseOptions)).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_INPUT,
    });
  });

  it('mauTransactionsCommand requires a date range', async () => {
    await expect(mauTransactionsCommand('5331', baseOptions)).rejects.toBeInstanceOf(CliError);
    await expect(mauTransactionsCommand('5331', baseOptions)).rejects.toMatchObject({
      code: ERROR_CODES.MISSING_DATE_RANGE,
    });
  });

  it('mauTransactionsCommand fetches transactions', async () => {
    const transactions = [
      {
        description: 'Credit',
        creditAmount: 10,
        debitAmount: 0,
        transactionDate: '2024-01-02',
        bankReference: 'REF',
        amount: 10,
        runningBalance: 100,
      },
    ];
    mockApi.getAccountTransactions.mockResolvedValue({ data: { transactions } });

    await mauTransactionsCommand('5331', {
      ...baseOptions,
      from: '2024-01-01',
      to: '2024-01-31',
    });

    expect(mockApi.getAccountTransactions).toHaveBeenCalledWith('5331', '2024-01-01', '2024-01-31');
    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: transactions,
      })
    );
  });

  it('mauDocumentsCommand lists documents', async () => {
    mockApi.getAccountDocuments.mockResolvedValue({
      availableDocuments: {
        accountNumber: '10101010101',
        documentInformation: [{ documentDate: '2025-01-31', documentType: 'Statement' }],
      },
    });

    await mauDocumentsCommand('5331', {
      ...baseOptions,
      from: '2025-01-01',
      to: '2025-01-31',
    });

    expect(mockApi.getAccountDocuments).toHaveBeenCalledWith('5331', '2025-01-01', '2025-01-31');
    expect(runListCommand).toHaveBeenCalled();
  });

  it('mauStatementCommand downloads a PDF', async () => {
    mockApi.downloadAccountStatement.mockResolvedValue(new ArrayBuffer(8));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await mauStatementCommand('5331', '2025-01-31', {
      ...baseOptions,
      output: 'statement-5331-2025-01-31.pdf',
    });

    expect(mockApi.downloadAccountStatement).toHaveBeenCalledWith('5331', '2025-01-31');
    expect(writeFile).toHaveBeenCalled();
  });
});
