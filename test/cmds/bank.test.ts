/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bankCommand } from '../../src/cmds/bank';
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
    openaiKey: 'sk-test-key',
    sandboxKey: '',
  },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
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
  };
});

describe('bankCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatCreate.mockReset();
  });

  it('prints assistant content when OpenAI returns a text message', async () => {
    mockChatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Your balance looks fine.',
            tool_calls: undefined,
          },
        },
      ],
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await bankCommand('What is my balance?', {
      credentialsFile: '',
      filename: '',
      verbose: false,
    });

    expect(mockChatCreate).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Your balance looks fine.');
    errSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('wraps OpenAI failures in CliError INVALID_INPUT', async () => {
    mockChatCreate.mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      bankCommand('ping', {
        credentialsFile: '',
        filename: '',
        verbose: false,
      })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('network down')
    );

    errSpy.mockRestore();
  });
});
