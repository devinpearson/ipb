/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import { runCommand } from '../../src/cmds/run';

const mockCreateTransaction = vi.hoisted(() => vi.fn());
const mockRun = vi.hoisted(() => vi.fn());

vi.mock('programmable-card-code-emulator', () => ({
  createTransaction: mockCreateTransaction,
  run: mockRun,
}));

vi.mock('../../src/index.ts', () => ({
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockUtilsState = vi.hoisted(() => ({
  validateFilePath: vi.fn(),
  getFileSize: vi.fn(),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    validateFilePath: mockUtilsState.validateFilePath,
    getFileSize: mockUtilsState.getFileSize,
    formatFileSize: vi.fn((bytes: number) => `${bytes} B`),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      text: '',
    })),
    withSpinner: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
  };
});

const mockFsPromises = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { promises: mockFsPromises },
  promises: mockFsPromises,
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockFsPromises.readFile,
}));

describe('runCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();

    mockUtilsState.validateFilePath.mockImplementation(async (file: string) => {
      if (file === '.env.dev') {
        return '/tmp/.env.dev';
      }
      if (file === 'code.js') {
        return '/tmp/code.js';
      }
      return file;
    });
    mockUtilsState.getFileSize.mockResolvedValue(128);
    mockCreateTransaction.mockReturnValue({
      currencyCode: 'ZAR',
      centsAmount: 10000,
      merchant: {
        category: { code: '1234' },
        name: 'Test Merchant',
        city: 'Cape Town',
        country: { code: 'ZA' },
      },
    });
  });

  it('runs emulator with code and parsed env variables', async () => {
    mockFsPromises.readFile
      .mockResolvedValueOnce('API_KEY=abc123\nEMPTY=\nQUOTED="hello"')
      .mockResolvedValueOnce('console.log("hello");');
    mockRun.mockResolvedValue([
      { type: 'INFO', logs: [{ level: 'info', content: 'ran' }] },
    ]);

    await runCommand({
      filename: 'code.js',
      env: 'dev',
      currency: 'zar',
      amount: 10000,
      mcc: '1234',
      merchant: 'Test Merchant',
      city: 'Cape Town',
      country: 'ZA',
      verbose: false,
    });

    expect(mockCreateTransaction).toHaveBeenCalledWith(
      'zar',
      10000,
      '1234',
      'Test Merchant',
      'Cape Town',
      'ZA'
    );
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(Object),
      'console.log("hello");',
      JSON.stringify({
        API_KEY: 'abc123',
        EMPTY: '',
        QUOTED: 'hello',
      })
    );
  });

  it('throws missing env file error when env file validation fails', async () => {
    mockUtilsState.validateFilePath.mockImplementation(async (file: string) => {
      if (file === '.env.dev') {
        throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'missing env');
      }
      return '/tmp/code.js';
    });
    mockFsPromises.readFile.mockResolvedValue('console.log("hello");');

    await expect(
      runCommand({
        filename: 'code.js',
        env: 'dev',
        currency: 'zar',
        amount: 10000,
        mcc: '1234',
        merchant: 'Test Merchant',
        city: 'Cape Town',
        country: 'ZA',
        verbose: false,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.MISSING_ENV_FILE });
  });

  it('returns early when code file is empty', async () => {
    mockFsPromises.readFile.mockResolvedValue('');

    await runCommand({
      filename: 'code.js',
      env: '',
      currency: 'zar',
      amount: 10000,
      mcc: '1234',
      merchant: 'Test Merchant',
      city: 'Cape Town',
      country: 'ZA',
      verbose: false,
    });

    expect(mockRun).not.toHaveBeenCalled();
  });
});
