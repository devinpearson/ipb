/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { cardsCommand } from '../../src/cmds/cards';

vi.mock('../../src/index.ts', () => ({
  credentials: {},
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializeApi: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
    })),
    formatOutput: vi.fn(),
    runListCommand: vi.fn(),
    printTable: vi.fn(),
    isStdoutPiped: vi.fn(() => false), // Mock as not piped for tests
  };
});

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  getCards: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('cardsCommand', () => {
  it('should fetch and display cards correctly', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    const mockCards = [
      {
        CardKey: '123',
        CardNumber: '4567 8901 2345 6789',
        IsProgrammable: true,
      },
      {
        CardKey: '456',
        CardNumber: '9876 5432 1098 7654',
        IsProgrammable: false,
      },
    ];

    mockApi.getCards.mockResolvedValue({ data: { cards: mockCards } });

    console.log = vi.fn();
    const { runListCommand } = await import('../../src/utils.ts');

    await cardsCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: mockCards,
        outputOptions: { json: undefined, yaml: undefined, output: undefined },
      })
    );
  });

  it('should handle no cards found', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
    };

    mockApi.getCards.mockResolvedValue({ data: { cards: null } });

    const { runListCommand } = await import('../../src/utils.ts');

    await cardsCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: null,
        emptyMessage: 'No cards found',
      })
    );
  });

  it('should propagate errors (error handling is done at top level)', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: true,
    };

    const error = new Error('Test error');
    mockApi.getCards.mockRejectedValue(error);

    await expect(cardsCommand(options)).rejects.toThrow('Test error');
  });
});
