/// <reference types="vitest" />

/**
 * Ensures pay/transfer amount args stay typed the way Commander delivers them (strings)
 * and still succeed end-to-end through the real command handlers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { payCommand } from '../../src/cmds/pay';
import { transferCommand } from '../../src/cmds/transfer';
import { withCommandContext } from '../../src/utils/cli-errors';

const mockUtilsState = vi.hoisted(() => ({
  confirmed: true,
  pbApi: {
    payMultiple: vi.fn(),
    transferMultiple: vi.fn(),
  },
}));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

vi.mock('../../src/runtime-credentials.ts', async () => {
  const { getRuntimeCredentialsMock } = await import('../helpers/cli-mocks.js');
  return getRuntimeCredentialsMock();
});

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
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
    withSpinnerOutcome: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
  };
});

function buildPayProgram(actionSpy: ReturnType<typeof vi.fn>) {
  const program = new Command();
  program.exitOverride();
  program
    .command('pay')
    .argument('accountId', 'Account ID to pay from')
    .argument('beneficiaryId', 'Beneficiary ID to pay to')
    .argument('amount', 'Amount to pay in rands (e.g. 100.00)')
    .argument('reference', 'Payment reference message')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(
      withCommandContext('pay', async (...args: Parameters<typeof payCommand>) => {
        actionSpy(...args);
        return payCommand(...args);
      })
    );
  return program;
}

function buildTransferProgram(actionSpy: ReturnType<typeof vi.fn>) {
  const program = new Command();
  program.exitOverride();
  program
    .command('transfer')
    .argument('accountId', 'Account ID to transfer from')
    .argument('beneficiaryAccountId', 'Beneficiary account ID to transfer to')
    .argument('amount', 'Amount to transfer in rands (e.g. 100.00)')
    .argument('reference', 'Payment reference message')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(
      withCommandContext('transfer', async (...args: Parameters<typeof transferCommand>) => {
        actionSpy(...args);
        return transferCommand(...args);
      })
    );
  return program;
}

describe('Commander amount args for pay/transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUtilsState.confirmed = true;
    mockUtilsState.pbApi.payMultiple.mockReset();
    mockUtilsState.pbApi.transferMultiple.mockReset();
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          { BeneficiaryAccountId: 'b1', PaymentReferenceNumber: 'PRN1' },
        ],
      },
    });
    mockUtilsState.pbApi.transferMultiple.mockResolvedValue({
      data: {
        TransferResponses: [{ BeneficiaryAccountId: 'mock-account-id', Status: 'Success' }],
      },
    });
  });

  it('pay parseAsync passes amount as a string and still succeeds', async () => {
    const actionSpy = vi.fn();
    const program = buildPayProgram(actionSpy);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(
      ['pay', 'mock-account-id', 'b1', '100.00', 'test-payment', '--yes'],
      { from: 'user' }
    );

    expect(actionSpy).toHaveBeenCalled();
    const amountArg = actionSpy.mock.calls[0]?.[2];
    expect(typeof amountArg).toBe('string');
    expect(amountArg).toBe('100.00');

    expect(mockUtilsState.pbApi.payMultiple).toHaveBeenCalledWith('mock-account-id', [
      {
        beneficiaryId: 'b1',
        amount: '100',
        myReference: 'test-payment',
        theirReference: 'test-payment',
      },
    ]);
    logSpy.mockRestore();
  });

  it('transfer parseAsync passes amount as a string and still succeeds', async () => {
    const actionSpy = vi.fn();
    const program = buildTransferProgram(actionSpy);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(
      ['transfer', 'mock-account-id', 'mock-account-id', '100.00', 'test-transfer', '--yes'],
      { from: 'user' }
    );

    expect(actionSpy).toHaveBeenCalled();
    const amountArg = actionSpy.mock.calls[0]?.[2];
    expect(typeof amountArg).toBe('string');
    expect(amountArg).toBe('100.00');

    expect(mockUtilsState.pbApi.transferMultiple).toHaveBeenCalledWith('mock-account-id', [
      {
        beneficiaryAccountId: 'mock-account-id',
        amount: '100',
        myReference: 'test-transfer',
        theirReference: 'test-transfer',
      },
    ]);
    logSpy.mockRestore();
  });

  it('pay parseAsync rejects invalid string amounts', async () => {
    const actionSpy = vi.fn();
    const program = buildPayProgram(actionSpy);

    await expect(
      program.parseAsync(['pay', 'mock-account-id', 'b1', 'nope', 'ref', '--yes'], {
        from: 'user',
      })
    ).rejects.toThrow(/valid number/);

    expect(actionSpy).toHaveBeenCalled();
    expect(typeof actionSpy.mock.calls[0]?.[2]).toBe('string');
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });
});
