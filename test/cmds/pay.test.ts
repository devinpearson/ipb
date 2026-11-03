/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { payCommand } from '../../src/cmds/pay';
import { CliError, ERROR_CODES } from '../../src/errors';
import { setInteractive } from '../helpers/tty';

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
    getAccounts: vi.fn(),
    getBeneficiaries: vi.fn(),
  },
}));

const accountsResponse = {
  data: {
    accounts: ['acc-001', 'acc-007'].map((accountId) => ({
      accountId,
      accountNumber: '10011001',
      accountName: 'Mr Test',
      referenceName: 'Everyday',
      productName: 'Private Bank Account',
    })),
  },
};

const beneficiariesResponse = {
  data: ['benef-001', 'benef-009'].map((beneficiaryId) => ({
    beneficiaryId,
    beneficiaryName: 'City Power',
    name: 'City Power',
    bank: 'FNB',
    accountNumber: '62000000',
  })),
  meta: { totalPages: 1 },
};

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
    mockUtilsState.pbApi.getAccounts.mockResolvedValue(accountsResponse);
    mockUtilsState.pbApi.getBeneficiaries.mockResolvedValue(beneficiariesResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.IPB_READ_ONLY;
  });

  it('is blocked in read-only mode before prompting or calling the API', async () => {
    process.env.IPB_READ_ONLY = '1';

    await expect(payCommand('', '', 0, '', baseOptions)).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.READ_ONLY
    );
    expect(mockInput).not.toHaveBeenCalled();
    expect(mockUtilsState.pbApi.getAccounts).not.toHaveBeenCalled();
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('still allows --dry-run in read-only mode', async () => {
    process.env.IPB_READ_ONLY = '1';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await payCommand('acc-001', 'benef-001', '10', 'ref', { ...baseOptions, dryRun: true });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nothing was sent'));
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
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
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment to benef-001 accepted (reference prn-001)')
    );
    logSpy.mockRestore();
  });

  it('shows beneficiary and account names in the confirmation summary', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [{ BeneficiaryName: 'City Power', PaymentReferenceNumber: 'p1' }],
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await payCommand('acc-001', 'benef-001', '10', 'ref', baseOptions);

    const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('Everyday (Private Bank Account, 10011001)');
    expect(output).toContain('City Power (FNB, 62000000)');
    logSpy.mockRestore();
  });

  it('refuses to pay a beneficiary that is not on the profile', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(payCommand('acc-001', 'benef-typo', '10', 'ref', baseOptions)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('benef-typo')
    );
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('refuses to pay from an account that is not the user’s', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(payCommand('acc-999', 'benef-001', '10', 'ref', baseOptions)).rejects.toThrow(
      /acc-999 is not one of your accounts/
    );
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('allows an unlisted beneficiary when the beneficiary list is paginated', async () => {
    mockUtilsState.pbApi.getBeneficiaries.mockResolvedValue({
      ...beneficiariesResponse,
      meta: { totalPages: 2 },
    });
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [{ BeneficiaryAccountId: 'benef-x', PaymentReferenceNumber: 'p1' }],
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await payCommand('acc-001', 'benef-x', '10', 'ref', baseOptions);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('name not found'));
    expect(mockUtilsState.pbApi.payMultiple).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('fails with PAYMENT_NOT_CONFIRMED when the bank returns no reference number', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          {
            BeneficiaryName: 'City Power',
            PaymentReferenceNumber: '',
            Status: 'Insufficient funds',
          },
        ],
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(payCommand('acc-001', 'benef-001', '10', 'ref', baseOptions)).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.PAYMENT_NOT_CONFIRMED
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('was not confirmed by the bank'));
    expect(logSpy).toHaveBeenCalledWith('  Status: Insufficient funds');
    logSpy.mockRestore();
  });

  it('fails with PAYMENT_NOT_CONFIRMED when the bank returns no results', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({ data: { TransferResponses: [] } });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(payCommand('acc-001', 'benef-001', '10', 'ref', baseOptions)).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.PAYMENT_NOT_CONFIRMED
    );
  });

  it('warns when the payment needs approval in the app and cleans up the status text', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: {
        TransferResponses: [
          {
            BeneficiaryName: 'City Power',
            PaymentReferenceNumber: 'p1',
            AuthorisationRequired: true,
            Status: '- Authorisation required <br> - Payment/Transfer effective date 2026-11-03',
          },
        ],
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await payCommand('acc-001', 'benef-001', '10', 'ref', baseOptions);

    const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('needs your approval (reference p1)');
    expect(output).toContain('Approve it in the Investec app');
    expect(output).not.toContain('accepted');
    expect(output).toContain(
      'Status: Authorisation required; Payment/Transfer effective date 2026-11-03'
    );
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
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('R100.00'));
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
    const restoreTty = setInteractive(true);

    try {
      await payCommand('acc-001', 'benef-001', '100.00', 'Test', {
        ...baseOptions,
        yes: false,
      });
    } finally {
      restoreTty();
    }

    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Payment cancelled.');
    logSpy.mockRestore();
  });

  it('fails instead of silently cancelling when there is no terminal and no --yes', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const restoreTty = setInteractive(false);

    try {
      await expect(
        payCommand('acc-001', 'benef-001', '10', 'ref', { ...baseOptions, yes: false })
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof CliError &&
          err.code === ERROR_CODES.INVALID_INPUT &&
          err.message.includes('--yes')
      );
    } finally {
      restoreTty();
    }
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('--dry-run checks names and shows the summary without paying', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await payCommand('acc-001', 'benef-001', '10', 'ref', { ...baseOptions, dryRun: true });

    const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('Payment Summary (dry run)');
    expect(output).toContain('City Power (FNB, 62000000)');
    expect(output).toContain('nothing was sent');
    expect(mockUtilsState.pbApi.payMultiple).not.toHaveBeenCalled();
  });

  it('--dry-run still rejects an unknown beneficiary', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(
      payCommand('acc-001', 'benef-typo', '10', 'ref', { ...baseOptions, dryRun: true })
    ).rejects.toThrow(/benef-typo/);
  });

  it('--json writes the bank results to stdout and human text to stderr', async () => {
    const responses = [
      { BeneficiaryName: 'City Power', PaymentReferenceNumber: 'p1', AuthorisationRequired: false },
    ];
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({ data: { TransferResponses: responses } });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await payCommand('acc-001', 'benef-001', '10', 'ref', { ...baseOptions, json: true });

    const stdout = writeSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(JSON.parse(stdout)).toEqual(responses);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('accepted');
  });

  it('--json still exits non-zero when the payment is not confirmed', async () => {
    mockUtilsState.pbApi.payMultiple.mockResolvedValue({
      data: { TransferResponses: [{ BeneficiaryName: 'City Power', PaymentReferenceNumber: '' }] },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await expect(
      payCommand('acc-001', 'benef-001', '10', 'ref', { ...baseOptions, json: true })
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.PAYMENT_NOT_CONFIRMED
    );
    expect(JSON.parse(writeSpy.mock.calls.map((c) => String(c[0])).join(''))).toHaveLength(1);
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
