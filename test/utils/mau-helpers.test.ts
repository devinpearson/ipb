/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import {
  extractMauAccounts,
  extractMauDataList,
  normalizeToArray,
} from '../../src/cmds/mau/helpers';

describe('MAU response normalization', () => {
  it('normalizeToArray keeps arrays', () => {
    expect(normalizeToArray([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it('normalizeToArray wraps singleton objects', () => {
    expect(normalizeToArray({ accountId: 5331, accountNumber: '1' })).toEqual([
      { accountId: 5331, accountNumber: '1' },
    ]);
  });

  it('normalizeToArray unwraps XML-style account wrappers', () => {
    expect(normalizeToArray({ account: { accountId: 1 } })).toEqual([{ accountId: 1 }]);
    expect(normalizeToArray({ account: [{ accountId: 1 }, { accountId: 2 }] })).toEqual([
      { accountId: 1 },
      { accountId: 2 },
    ]);
  });

  it('extractMauAccounts reads data.accounts arrays', () => {
    const accounts = [{ accountId: 1 }, { accountId: 2 }];
    expect(extractMauAccounts({ data: { accounts } })).toEqual(accounts);
  });

  it('extractMauAccounts wraps a singleton accounts object', () => {
    const account = { accountId: 5331, accountNumber: '1010', accountCurrency: 'USD' };
    expect(extractMauAccounts({ data: { accounts: account } })).toEqual([account]);
  });

  it('extractMauAccounts accepts data as a bare array', () => {
    const accounts = [{ accountId: 1 }];
    expect(extractMauAccounts({ data: accounts })).toEqual(accounts);
  });

  it('extractMauDataList reads nested list fields', () => {
    const transactions = [{ amount: 10 }];
    expect(extractMauDataList({ data: { transactions } }, 'transactions')).toEqual(transactions);
    expect(extractMauDataList({ data: { transactions: { amount: 5 } } }, 'transactions')).toEqual([
      { amount: 5 },
    ]);
  });
});
