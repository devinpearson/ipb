/// <reference types="vitest" />

import { promises as fsPromises } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountsCommand } from '../../src/cmds/accounts';
import { cardsCommand } from '../../src/cmds/cards';
import { deployCommand } from '../../src/cmds/deploy';
import { fetchCommand } from '../../src/cmds/fetch';

const mockState = vi.hoisted(() => ({
  isPiped: false,
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
  cardApi: {
    getSavedCode: vi.fn(),
    getCards: vi.fn(),
    uploadEnv: vi.fn(),
    uploadCode: vi.fn(),
    uploadPublishedCode: vi.fn(),
  },
  pbApi: {
    getAccounts: vi.fn(),
  },
}));

vi.mock('../../src/index.ts', () => ({
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

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    isStdoutPiped: vi.fn(() => mockState.isPiped),
    createSpinner: vi.fn(() => mockState.spinner),
    initializeApi: vi.fn(async () => mockState.cardApi),
    initializePbApi: vi.fn(async () => mockState.pbApi),
  };
});

describe('integration safety net', () => {
  beforeEach(() => {
    mockState.isPiped = false;
    mockState.spinner.start.mockClear();
    mockState.spinner.stop.mockClear();
    mockState.spinner.clear.mockClear();
    mockState.spinner.succeed.mockClear();
    mockState.spinner.fail.mockClear();
    mockState.cardApi.getSavedCode.mockReset();
    mockState.cardApi.getCards.mockReset();
    mockState.cardApi.uploadEnv.mockReset();
    mockState.cardApi.uploadCode.mockReset();
    mockState.cardApi.uploadPublishedCode.mockReset();
    mockState.pbApi.getAccounts.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accounts writes structured output when piped', async () => {
    mockState.isPiped = true;
    mockState.pbApi.getAccounts.mockResolvedValue({
      data: {
        accounts: [
          { accountId: 'acc-1', accountNumber: '123', referenceName: 'Main', productName: 'PB' },
        ],
      },
    });

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await accountsCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(writeSpy).toHaveBeenCalled();
    expect(
      writeSpy.mock.calls.some((call) => String(call[0]).includes('"accountId": "acc-1"'))
    ).toBe(true);
    writeSpy.mockRestore();
  });

  it('cards writes structured output when piped', async () => {
    mockState.isPiped = true;
    mockState.cardApi.getCards.mockResolvedValue({
      data: { cards: [{ CardKey: 1, CardNumber: '****1234', IsProgrammable: true }] },
    });

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await cardsCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(writeSpy).toHaveBeenCalled();
    expect(
      writeSpy.mock.calls.some((call) => String(call[0]).includes('"CardNumber": "****1234"'))
    ).toBe(true);
    writeSpy.mockRestore();
  });

  it('fetch always cleans spinner on error', async () => {
    mockState.cardApi.getSavedCode.mockRejectedValue(new Error('fetch failed'));

    await expect(
      fetchCommand({
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
        filename: 'ignored.js',
        cardKey: 123,
      })
    ).rejects.toThrow('fetch failed');

    expect(mockState.spinner.start).toHaveBeenCalled();
    expect(mockState.spinner.stop).toHaveBeenCalled();
  });

  it('deploy always cleans spinner on error', async () => {
    const tmpFile = path.join(os.tmpdir(), `ipb-deploy-${Date.now()}.js`);
    await fsPromises.writeFile(tmpFile, 'module.exports = {};', 'utf8');

    mockState.cardApi.uploadCode.mockRejectedValue(new Error('deploy failed'));

    await expect(
      deployCommand({
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
        filename: tmpFile,
        env: '',
        cardKey: 123,
        yes: true,
      })
    ).rejects.toThrow('deploy failed');

    expect(mockState.spinner.start).toHaveBeenCalled();
    expect(mockState.spinner.stop).toHaveBeenCalled();
  });
});
