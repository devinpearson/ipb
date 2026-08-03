/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beneficiariesCommand } from '../../src/cmds/beneficiaries';
import { countriesCommand } from '../../src/cmds/countries';
import { currenciesCommand } from '../../src/cmds/currencies';
import { merchantsCommand } from '../../src/cmds/merchants';

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
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockState = vi.hoisted(() => ({
  isPiped: false,
  cardApi: {
    getCountries: vi.fn(),
    getCurrencies: vi.fn(),
    getMerchants: vi.fn(),
  },
  pbApi: {
    getBeneficiaries: vi.fn(),
  },
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    isStdoutPiped: vi.fn(() => mockState.isPiped),
    initializeApi: vi.fn(async () => mockState.cardApi),
    initializePbApi: vi.fn(async () => mockState.pbApi),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      text: '',
    })),
    resolveSpinnerState: vi.fn(() => ({ spinnerEnabled: true, verbose: false })),
    withSpinner: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
    withRetry: vi.fn(async (fn: () => Promise<unknown>) => await fn()),
    runListCommand: vi.fn(),
  };
});

describe('reference data and beneficiaries commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isPiped = false;
  });

  it('countries command forwards fetched rows to runListCommand', async () => {
    mockState.cardApi.getCountries.mockResolvedValue({
      data: { result: [{ Code: 'ZA', Name: 'South Africa' }] },
    });

    const options = {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      json: true,
    };

    const { runListCommand } = await import('../../src/utils.ts');
    await countriesCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ Code: 'ZA', Name: 'South Africa' }],
        outputOptions: { json: true, yaml: undefined, output: undefined },
      })
    );
  });

  it('currencies command forwards fetched rows to runListCommand', async () => {
    mockState.cardApi.getCurrencies.mockResolvedValue({
      data: { result: [{ Code: 'ZAR', Name: 'Rand' }] },
    });

    const options = {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    const { runListCommand } = await import('../../src/utils.ts');
    await currenciesCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ Code: 'ZAR', Name: 'Rand' }],
      })
    );
  });

  it('merchants command forwards fetched rows to runListCommand', async () => {
    mockState.cardApi.getMerchants.mockResolvedValue({
      data: { result: [{ Code: '5411', Name: 'Grocery Stores' }] },
    });

    const options = {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    };

    const { runListCommand } = await import('../../src/utils.ts');
    await merchantsCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ Code: '5411', Name: 'Grocery Stores' }],
      })
    );
  });

  it('beneficiaries command forwards fetched rows to runListCommand', async () => {
    mockState.pbApi.getBeneficiaries.mockResolvedValue({
      data: [
        {
          beneficiaryId: 'b1',
          accountNumber: '123',
          beneficiaryName: 'Alice',
          lastPaymentDate: '2026-03-01',
          lastPaymentAmount: '100.00',
          referenceName: 'Utilities',
        },
      ],
    });

    const options = {
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      yaml: true,
    };

    const { runListCommand } = await import('../../src/utils.ts');
    await beneficiariesCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            beneficiaryId: 'b1',
            beneficiaryName: 'Alice',
          }),
        ],
        outputOptions: { json: undefined, yaml: true, output: undefined },
      })
    );
  });
});
