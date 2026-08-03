/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiCommand } from '../../src/cmds/ai';
import { CliError, ERROR_CODES } from '../../src/errors';

const mockChatCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockChatCreate,
      },
    };
    // biome-ignore lint/complexity/noUselessConstructor: mock class for default export
    constructor(_opts: unknown) {}
  },
}));

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentials: {
    host: 'https://openapi.investec.com',
    clientId: 'c',
    clientSecret: 's',
    apiKey: 'k',
    cardKey: '1',
    openaiKey: 'sk-test',
    sandboxKey: '',
  },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    getSafeText: vi.fn((text: string) => text),
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
    withSpinner: vi.fn(async (_s, _e, fn: () => Promise<unknown>) => await fn()),
    validateFilePathForWrite: vi.fn(async (p: string) => p),
    formatFileSize: vi.fn((n: number) => `${n} B`),
    getFileSize: vi.fn(async () => 42),
  };
});

const mockWriteFile = vi.hoisted(() => vi.fn());

vi.mock('node:fs', () => ({
  promises: {
    writeFile: mockWriteFile,
  },
}));

const validAiJson = () =>
  JSON.stringify({
    code: 'async function beforeTransaction() { return true; }\nasync function afterTransaction() {}\nasync function afterDecline() {}',
    env_variables: null,
    description: 'Test snippet',
    example_transaction: {
      accountNumber: '123',
      dateTime: '2025-01-01T00:00:00Z',
      centsAmount: 100,
      currencyCode: 'ZAR',
      reference: 'ref',
      merchant: {
        name: 'Shop',
        city: 'Cape Town',
        country: 'ZA',
        category: { key: 'k', code: '5411', name: 'Grocery' },
      },
    },
  });

describe('aiCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatCreate.mockReset();
    mockWriteFile.mockReset();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('writes generated code to the target file when OpenAI returns valid JSON', async () => {
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: validAiJson() } }],
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await aiCommand('Generate a decline handler', {
      credentialsFile: '',
      filename: 'out.js',
      verbose: false,
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      'out.js',
      expect.stringContaining('beforeTransaction'),
      'utf8'
    );
  });

  it('throws CliError when OpenAI returns no parsable content', async () => {
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      aiCommand('x', {
        credentialsFile: '',
        filename: 'out.js',
        verbose: false,
      })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('OpenAI response is missing or invalid')
    );
  });

  it('throws CliError when generated code string is empty', async () => {
    const bad = JSON.stringify({
      code: '   ',
      env_variables: null,
      description: 'd',
      example_transaction: {
        accountNumber: '1',
        dateTime: 't',
        centsAmount: 1,
        currencyCode: 'ZAR',
        reference: 'r',
        merchant: {
          name: 'm',
          city: 'c',
          country: 'ZA',
          category: { key: 'k', code: '5411', name: 'n' },
        },
      },
    });
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: bad } }],
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      aiCommand('x', {
        credentialsFile: '',
        filename: 'out.js',
        verbose: false,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_INPUT });
  });
});
