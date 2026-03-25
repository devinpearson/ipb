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

const indexMocks = vi.hoisted(() => ({
  printTitleBox: vi.fn(),
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
  printTitleBox: indexMocks.printTitleBox,
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

vi.mock('../../src/utils/terminal.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/terminal.js')>(
    '../../src/utils/terminal.js'
  );
  return {
    ...actual,
    /** Must match command-level isPiped: formatOutput reads this from terminal, not utils. */
    isStdoutPiped: vi.fn(() => mockState.isPiped),
  };
});

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
    indexMocks.printTitleBox.mockClear();
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
    expect(indexMocks.printTitleBox).not.toHaveBeenCalled();
    expect(mockState.spinner.start).not.toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it('accounts writes empty JSON array when piped and there are no accounts', async () => {
    mockState.isPiped = true;
    mockState.pbApi.getAccounts.mockResolvedValue({ data: { accounts: [] } });

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await accountsCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(writeSpy.mock.calls.some((call) => String(call[0]) === '[]\n')).toBe(true);
    writeSpy.mockRestore();
  });

  it('accounts uses table path on TTY and does not emit pretty-printed JSON on stdout', async () => {
    mockState.isPiped = false;
    mockState.pbApi.getAccounts.mockResolvedValue({
      data: {
        accounts: [
          { accountId: 'acc-1', accountNumber: '123', referenceName: 'Main', productName: 'PB' },
        ],
      },
    });

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await accountsCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    const jsonLikeOnStdout = writeSpy.mock.calls.some((call) =>
      String(call[0]).includes('"accountId"')
    );
    expect(jsonLikeOnStdout).toBe(false);
    expect(logSpy).toHaveBeenCalled();
    expect(indexMocks.printTitleBox).toHaveBeenCalled();

    writeSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('accounts stops spinner after API failure on TTY', async () => {
    mockState.isPiped = false;
    mockState.pbApi.getAccounts.mockRejectedValue(new Error('accounts unavailable'));

    await expect(
      accountsCommand({
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
      })
    ).rejects.toThrow('accounts unavailable');

    expect(mockState.spinner.start).toHaveBeenCalled();
    expect(mockState.spinner.stop).toHaveBeenCalled();
    expect(mockState.spinner.fail).not.toHaveBeenCalled();
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
    expect(indexMocks.printTitleBox).not.toHaveBeenCalled();
    expect(mockState.spinner.start).not.toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it('cards uses table path on TTY and avoids JSON on stdout', async () => {
    mockState.isPiped = false;
    mockState.cardApi.getCards.mockResolvedValue({
      data: { cards: [{ CardKey: 1, CardNumber: '****9999', IsProgrammable: false }] },
    });

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cardsCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(writeSpy.mock.calls.some((call) => String(call[0]).includes('"CardNumber"'))).toBe(
      false
    );
    expect(logSpy).toHaveBeenCalled();

    writeSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('cards stops spinner after API failure on TTY', async () => {
    mockState.isPiped = false;
    mockState.cardApi.getCards.mockRejectedValue(new Error('cards unavailable'));

    await expect(
      cardsCommand({
        host: 'h',
        apiKey: 'k',
        clientId: 'c',
        clientSecret: 's',
        credentialsFile: '',
        verbose: false,
      })
    ).rejects.toThrow('cards unavailable');

    expect(mockState.spinner.start).toHaveBeenCalled();
    expect(mockState.spinner.stop).toHaveBeenCalled();
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
    expect(mockState.spinner.fail).not.toHaveBeenCalled();
  });

  it('fetch does not start spinner when stdout is piped', async () => {
    mockState.isPiped = true;
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

    expect(mockState.spinner.start).not.toHaveBeenCalled();
    expect(mockState.spinner.stop).not.toHaveBeenCalled();
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
    expect(mockState.spinner.fail).not.toHaveBeenCalled();
  });

  it('deploy skips title box when stdout is piped', async () => {
    mockState.isPiped = true;
    const tmpFile = path.join(os.tmpdir(), `ipb-deploy-pipe-${Date.now()}.js`);
    await fsPromises.writeFile(tmpFile, 'module.exports = {};', 'utf8');

    mockState.cardApi.uploadCode.mockResolvedValue({
      data: { result: { codeId: 'code-1' } },
    });
    mockState.cardApi.uploadPublishedCode.mockResolvedValue({ data: {} });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await deployCommand({
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
    });

    expect(indexMocks.printTitleBox).not.toHaveBeenCalled();
    expect(mockState.spinner.start).not.toHaveBeenCalled();

    logSpy.mockRestore();
    await fsPromises.rm(tmpFile, { force: true });
  });

  it('deploy does not start spinner when piped even if upload fails', async () => {
    mockState.isPiped = true;
    const tmpFile = path.join(os.tmpdir(), `ipb-deploy-pipe-err-${Date.now()}.js`);
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

    expect(mockState.spinner.start).not.toHaveBeenCalled();
    expect(mockState.spinner.stop).not.toHaveBeenCalled();

    await fsPromises.rm(tmpFile, { force: true });
  });
});
