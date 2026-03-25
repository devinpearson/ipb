/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transferCommand } from '../../src/cmds/transfer';

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
  },
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    isStdoutPiped: vi.fn(() => mockUtilsState.isPiped),
    resolveSpinnerState: vi.fn(() => ({
      spinnerEnabled: mockUtilsState.spinnerEnabled,
      verbose: mockUtilsState.verbose,
    })),
    createSpinner: vi.fn(() => mockUtilsState.spinner),
    confirmDestructiveOperation: vi.fn(async () => mockUtilsState.confirmed),
    validateAccountId: vi.fn(),
    validateAmount: vi.fn(),
    initializePbApi: vi.fn(async () => mockUtilsState.pbApi),
    withRetry: vi.fn(async (fn: () => Promise<unknown>) => await fn()),
    withSpinnerOutcome: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
  };
});

describe('transferCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInput.mockReset();
    mockUtilsState.confirmed = true;
    mockUtilsState.isPiped = false;
    mockUtilsState.pbApi.transferMultiple.mockReset();
  });

  it('calls transferMultiple with expected payload when confirmed', async () => {
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: {
        TransferResponses: [{ BeneficiaryAccountId: '200002', Status: 'Success' }],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await transferCommand('100001', '200002', 125.5, 'Invoice 42', {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      yes: true,
    });

    expect(mockUtilsState.pbApi.transferMultiple).toHaveBeenCalledWith('100001', [
      {
        beneficiaryAccountId: '200002',
        amount: '125.5',
        myReference: 'Invoice 42',
        theirReference: 'Invoice 42',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith('Transfer to 200002: Success');
    logSpy.mockRestore();
  });

  it('does not call transfer API when confirmation is rejected', async () => {
    mockUtilsState.confirmed = false;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await transferCommand('100001', '200002', 100, 'Test', {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
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
        TransferResponses: [{ BeneficiaryAccountId: '400004', Status: 'Success' }],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await transferCommand('', '', 0, '', {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      yes: true,
    });

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
