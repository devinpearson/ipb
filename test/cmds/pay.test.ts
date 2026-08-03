/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { payCommand } from '../../src/cmds/pay';
import { CliError, ERROR_CODES } from '../../src/errors';

const mockInput = vi.hoisted(() => vi.fn());

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
}));

vi.mock('../../src/runtime-credentials.ts', async () => {
  const { getRuntimeCredentialsMock } = await import('../helpers/cli-mocks.js');
  return getRuntimeCredentialsMock();
});

const mockUtilsState = vi.hoisted(() => ({
  confirmed: true,
  pbApi: {
    payMultiple: vi.fn(),
  },
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    // Keep real validateAmount — Commander passes string args and regression depends on it.
    confirmDestructiveOperation: vi.fn(async () => mockUtilsState.confirmed),
    initializePbApi: vi.fn(async () => mockUtilsState.pbApi),
    isStdoutPiped: vi.fn(() => false),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      clear: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
    })),
    withRetry: vi.fn(async (fn: () => Promise<unknown>) => await fn()),
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

describe('payCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInput.mockReset();
    mockUtilsState.confirmed = true;
    mockUtilsState.pbApi.payMultiple.mockReset();
  });

  it('accepts numeric amounts', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          { BeneficiaryAccountId: 'benef-001', PaymentReferenceNumber: 'prn-001' },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await payCommand('acc-001', 'benef-001', 55.25, 'Utilities', baseOptions);

    expect(mockUtilsState.pbApi.payMultiple).toHaveBeenCalledWith('acc-001', [
      {
        beneficiaryId: 'benef-001',
        amount: '55.25',
        myReference: 'Utilities',
        theirReference: 'Utilities',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith('Transfer to benef-001, reference prn-001 was successful.');
    logSpy.mockRestore();
  });

  it('accepts string amounts the way Commander passes CLI args', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          { BeneficiaryAccountId: 'benef-001', PaymentReferenceNumber: 'prn-001' },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await payCommand('acc-001', 'benef-001', '100.00', 'test-payment', baseOptions);

    expect(mockUtilsState.pbApi.payMultiple).toHaveBeenCalledWith('acc-001', [
      {
        beneficiaryId: 'benef-001',
        amount: '100',
        myReference: 'test-payment',
        theirReference: 'test-payment',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Amount: R100.00'));
    logSpy.mockRestore();
  });

  it('rejects non-numeric CLI string amounts before calling the API', async () => {
    await expect(
      payCommand('acc-001', 'benef-001', 'not-a-number', 'ref', baseOptions)
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('valid number')
    );
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('rejects non-positive CLI string amounts', async () => {
    await expect(payCommand('acc-001', 'benef-001', '0', 'ref', baseOptions)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('positive')
    );
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('does not call payment API when confirmation is rejected', async () => {
    mockUtilsState.confirmed = false;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await payCommand('acc-001', 'benef-001', '100.00', 'Test', {
      ...baseOptions,
      yes: false,
    });

    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Payment cancelled.');
    logSpy.mockRestore();
  });

  it('prompts for missing args and uses prompted values', async () => {
    mockInput
      .mockResolvedValueOnce('acc-007')
      .mockResolvedValueOnce('benef-009')
      .mockResolvedValueOnce('250.75')
      .mockResolvedValueOnce('Prompted payment');
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          { BeneficiaryAccountId: 'benef-009', PaymentReferenceNumber: 'prn-009' },
        ],
      },
    });

    await payCommand('', '', 0, '', baseOptions);

    expect(mockInput).toHaveBeenCalledTimes(4);
    expect(mockUtilsState.pbApi.payMultiple).toHaveBeenCalledWith('acc-007', [
      {
        beneficiaryId: 'benef-009',
        amount: '250.75',
        myReference: 'Prompted payment',
        theirReference: 'Prompted payment',
      },
    ]);
  });

  it('throws when prompted beneficiary is empty', async () => {
    mockInput.mockResolvedValueOnce('acc-007').mockResolvedValueOnce(' ');

    await expect(payCommand('', '', 0, '', baseOptions)).rejects.toThrow(CliError);
  });
});
