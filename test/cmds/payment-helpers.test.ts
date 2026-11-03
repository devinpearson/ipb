/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import {
  assertCanConfirm,
  describeBeneficiary,
  printSummary,
  reportTransferResults,
} from '../../src/cmds/payment-helpers';
import { CliError, ERROR_CODES } from '../../src/errors';
import type { IPbApi } from '../../src/mock-pb';

function apiWithBeneficiaries(data: unknown[], meta?: { totalPages: number }): IPbApi {
  return { getBeneficiaries: vi.fn(async () => ({ data, meta })) } as unknown as IPbApi;
}

function withTty(stdin: boolean, stdout: boolean, fn: () => void) {
  const original = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY };
  process.stdin.isTTY = stdin;
  process.stdout.isTTY = stdout;
  try {
    fn();
  } finally {
    process.stdin.isTTY = original.stdin;
    process.stdout.isTTY = original.stdout;
  }
}

describe('assertCanConfirm', () => {
  it('needs both stdin and stdout to be a terminal to prompt', () => {
    withTty(true, false, () => expect(() => assertCanConfirm(false, 'payment')).toThrow(CliError));
    withTty(false, true, () => expect(() => assertCanConfirm(false, 'payment')).toThrow(CliError));
    withTty(true, true, () => expect(() => assertCanConfirm(false, 'payment')).not.toThrow());
  });

  it('allows --yes without a terminal', () => {
    withTty(false, false, () => expect(() => assertCanConfirm(true, 'transfer')).not.toThrow());
  });
});

describe('describeBeneficiary', () => {
  it('labels the beneficiary with bank, account number and the ID', async () => {
    const api = apiWithBeneficiaries([
      { beneficiaryId: 'b1', beneficiaryName: 'City Power', bank: 'FNB', accountNumber: '620' },
    ]);
    const { label } = await describeBeneficiary(api, 'b1');
    expect(label).toContain('City Power (FNB, 620)');
    expect(label).toContain('[b1]');
  });

  it('falls back to name when beneficiaryName is empty and omits a missing bank', async () => {
    const api = apiWithBeneficiaries([
      { beneficiaryId: 'b1', beneficiaryName: '', name: 'Gran', bank: '', accountNumber: '9' },
    ]);
    const { label } = await describeBeneficiary(api, 'b1');
    expect(label).toMatch(/^Gran \(9\)/);
  });

  it('rejects an unknown ID when the response has no pagination info', async () => {
    const api = apiWithBeneficiaries([{ beneficiaryId: 'b1', beneficiaryName: 'X' }]);
    await expect(describeBeneficiary(api, 'nope')).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.INVALID_INPUT
    );
  });

  it('returns a null label (not an error) for an unknown ID on a paginated list', async () => {
    const api = apiWithBeneficiaries([], { totalPages: 3 });
    await expect(describeBeneficiary(api, 'nope')).resolves.toEqual({ label: null });
  });
});

describe('printSummary', () => {
  it('prints a title, divider and aligned rows', () => {
    const lines: string[] = [];
    printSummary((m) => lines.push(m), 'Payment Summary', [
      ['From', 'Main'],
      ['Reference', 'rent'],
    ]);
    expect(lines).toEqual([
      '\nPayment Summary:',
      '-------------------------',
      'From:      Main',
      'Reference: rent',
      '',
    ]);
  });
});

describe('reportTransferResults', () => {
  const collect = (responses: Parameters<typeof reportTransferResults>[0]) => {
    const lines: string[] = [];
    reportTransferResults(responses, 'Payment', (m) => lines.push(m));
    return lines;
  };

  it('prints no Status line when the bank sends none', () => {
    const lines = collect([
      {
        BeneficiaryName: 'X',
        BeneficiaryAccountId: '1',
        PaymentReferenceNumber: 'p1',
        PaymentDate: '',
        Status: '',
        AuthorisationRequired: false,
      },
    ]);
    expect(lines).toHaveLength(1);
  });

  it('strips only leading list dashes from status parts', () => {
    const lines = collect([
      {
        BeneficiaryName: 'X',
        BeneficiaryAccountId: '1',
        PaymentReferenceNumber: 'p1',
        PaymentDate: '',
        Status: '-   No authorisation necessary <BR /> Same-day payment<br>',
        AuthorisationRequired: false,
      },
    ]);
    expect(lines).toContain('  Status: No authorisation necessary; Same-day payment');
  });

  it('reports an unconfirmed payment without a Status line and counts it in the error', () => {
    const lines: string[] = [];
    expect(() =>
      reportTransferResults(
        [
          {
            BeneficiaryName: 'X',
            BeneficiaryAccountId: '1',
            PaymentReferenceNumber: '',
            PaymentDate: '',
            Status: '',
            AuthorisationRequired: false,
          },
        ],
        'Payment',
        (m) => lines.push(m)
      )
    ).toThrow('1 payment(s) not confirmed by the bank. Check `ipb transactions` before retrying.');
    expect(lines).toHaveLength(1);
  });

  it('names the problem when the bank returns no results', () => {
    expect(() => collect([])).toThrow(/Payment not confirmed: the bank returned no result/);
  });
});
