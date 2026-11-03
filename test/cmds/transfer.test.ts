/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transferCommand } from '../../src/cmds/transfer';
import { CliError, ERROR_CODES } from '../../src/errors';

const mockInput = vi.hoisted(() => vi.fn());

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
}));

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentials: {
    host: 'https://openapi.investec.com',
    clientId: 'cid',
    clientSecret: 'secret',
    apiKey: 'key',
    cardKey: '123',
    openaiKey: '',
    sandboxKey: '',
  },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockUtilsState = vi.hoisted(() => ({
  isPiped: false,
  spinnerEnabled: true,
  verbose: false,
  confirmed: true,
  spinner: {
    start: vi.fn(function () {
      return this;
    }),
    stop: vi.fn(function () {
      return this;
    }),
    clear: vi.fn(function () {
      return this;
    }),
    succeed: vi.fn(function () {
      return this;
    }),
    fail: vi.fn(function () {
      return this;
    }),
    text: '',
  },
  pbApi: {
    transferMultiple: vi.fn(),
    getAccounts: vi.fn(),
  },
}));

const accountsResponse = {
  data: {
    accounts: [
      ['100001', 'Everyday'],
      ['200002', 'Savings'],
      ['300003', 'Bills'],
      ['400004', 'Holiday'],
    ].map(([accountId, referenceName]) => ({
      accountId,
      accountNumber: `acc-no-${accountId}`,
      accountName: 'Mr Test',
      referenceName,
      productName: 'Private Bank Account',
    })),
  },
};

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    // Keep real validateAmount — Commander passes string args and regression depends on it.
    isStdoutPiped: vi.fn(() => mockUtilsState.isPiped),
    resolveSpinnerState: vi.fn(() => ({
      spinnerEnabled: mockUtilsState.spinnerEnabled,
      verbose: mockUtilsState.verbose,
    })),
    createSpinner: vi.fn(() => mockUtilsState.spinner),
    confirmDestructiveOperation: vi.fn(async () => mockUtilsState.confirmed),
    initializePbApi: vi.fn(async () => mockUtilsState.pbApi),
    withRetry: vi.fn(async (fn: () => Promise<unknown>) => await fn()),
    withSpinnerOutcome: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
  };
});

const baseOptions = {
  host: 'h',
  apiKey: 'k',
  clientId: 'c',
  clientSecret: 's',
  credentialsFile: '',
  verbose: false,
  yes: true,
};

describe('transferCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInput.mockReset();
    mockUtilsState.confirmed = true;
    mockUtilsState.isPiped = false;
    mockUtilsState.pbApi.transferMultiple.mockReset();
    mockUtilsState.pbApi.getAccounts.mockResolvedValue(accountsResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts numeric amounts', async () => {
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          {
            BeneficiaryAccountId: '200002',
            PaymentReferenceNumber: 'tr-200002',
            Status: 'Success',
          },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await transferCommand('100001', '200002', 125.5, 'Invoice 42', baseOptions);

    expect(mockUtilsState.pbApi.transferMultiple).toHaveBeenCalledWith('100001', [
      {
        beneficiaryAccountId: '200002',
        amount: '125.5',
        myReference: 'Invoice 42',
        theirReference: 'Invoice 42',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Transfer to 200002 accepted (reference tr-200002)')
    );
    expect(logSpy).toHaveBeenCalledWith('  Status: Success');
    logSpy.mockRestore();
  });

  it('shows both account names in the confirmation summary', async () => {
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: {
        TransferResponses: [{ BeneficiaryAccountId: '200002', PaymentReferenceNumber: 't1' }],
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await transferCommand('100001', '200002', '5', 'ref', baseOptions);

    const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('Everyday (Private Bank Account, acc-no-100001)');
    expect(output).toContain('Savings (Private Bank Account, acc-no-200002)');
    expect(mockUtilsState.pbApi.getAccounts).toHaveBeenCalledTimes(1);
  });

  it('refuses to transfer to an account that is not the user’s', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(transferCommand('100001', '999999', '5', 'ref', baseOptions)).rejects.toThrow(
      /999999 is not one of your accounts/
    );
    expect(mockUtilsState.pbApi.transferMultiple).not.toHaveBeenCalled();
  });

  it('fails with PAYMENT_NOT_CONFIRMED when the bank returns no reference number', async () => {
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: { TransferResponses: [{ BeneficiaryAccountId: '200002', Status: 'Rejected' }] },
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(transferCommand('100001', '200002', '5', 'ref', baseOptions)).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.PAYMENT_NOT_CONFIRMED
    );
  });

  it('accepts string amounts the way Commander passes CLI args', async () => {
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          {
            BeneficiaryAccountId: '200002',
            PaymentReferenceNumber: 'tr-200002',
            Status: 'Success',
          },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await transferCommand('100001', '200002', '100.00', 'test-transfer', baseOptions);

    expect(mockUtilsState.pbApi.transferMultiple).toHaveBeenCalledWith('100001', [
      {
        beneficiaryAccountId: '200002',
        amount: '100',
        myReference: 'test-transfer',
        theirReference: 'test-transfer',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('R100.00'));
    logSpy.mockRestore();
  });

  it('rejects non-numeric CLI string amounts before calling the API', async () => {
    await expect(transferCommand('100001', '200002', 'abc', 'ref', baseOptions)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('valid number')
    );
    expect(mockUtilsState.pbApi.transferMultiple).not.toHaveBeenCalled();
  });

  it('does not call transfer API when confirmation is rejected', async () => {
    mockUtilsState.confirmed = false;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await transferCommand('100001', '200002', '100.00', 'Test', {
      ...baseOptions,
      yes: false,
    });

    expect(mockUtilsState.pbApi.transferMultiple).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Transfer cancelled.');
    logSpy.mockRestore();
  });

  it('prompts for missing args and uses prompted values', async () => {
    mockInput
      .mockResolvedValueOnce('300003')
      .mockResolvedValueOnce('400004')
      .mockResolvedValueOnce('250.75')
      .mockResolvedValueOnce('Prompted ref');
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          {
            BeneficiaryAccountId: '400004',
            PaymentReferenceNumber: 'tr-400004',
            Status: 'Success',
          },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await transferCommand('', '', 0, '', baseOptions);

    expect(mockInput).toHaveBeenCalledTimes(4);
    expect(mockUtilsState.pbApi.transferMultiple).toHaveBeenCalledWith('300003', [
      {
        beneficiaryAccountId: '400004',
        amount: '250.75',
        myReference: 'Prompted ref',
        theirReference: 'Prompted ref',
      },
    ]);
    logSpy.mockRestore();
  });
});
