/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disableCommand } from '../../src/cmds/disable';
import { enableCommand } from '../../src/cmds/toggle';

vi.mock('../../src/index.ts', () => ({
  credentials: { cardKey: 'default-card-key' },
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockState = vi.hoisted(() => ({
  confirmed: true,
  isPiped: false,
  api: {
    toggleCode: vi.fn(),
  },
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    normalizeCardKey: vi.fn((key, defaultKey) => key || defaultKey),
    isStdoutPiped: vi.fn(() => mockState.isPiped),
    resolveSpinnerState: vi.fn(() => ({ spinnerEnabled: true, verbose: false })),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      text: '',
    })),
    initializeApi: vi.fn(async () => mockState.api),
    withSpinner: vi.fn(async (_spinner, _enabled, fn: () => Promise<unknown>) => await fn()),
    confirmDestructiveOperation: vi.fn(async () => mockState.confirmed),
  };
});

describe('enableCommand / disableCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    mockState.confirmed = true;
  });

  it('enable command logs success when API reports enabled', async () => {
    mockState.api.toggleCode.mockResolvedValue({ data: { result: { Enabled: true } } });

    await enableCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
    });

    expect(mockState.api.toggleCode).toHaveBeenCalledWith('default-card-key', true);
    expect(console.log).toHaveBeenCalledWith('✅ code enabled');
  });

  it('disable command does not call API when confirmation is rejected', async () => {
    mockState.confirmed = false;

    await disableCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      yes: false,
    });

    expect(mockState.api.toggleCode).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Disable cancelled.');
  });

  it('disable command logs success when API reports disabled', async () => {
    mockState.api.toggleCode.mockResolvedValue({ data: { result: { Enabled: false } } });

    await disableCommand({
      host: 'h',
      apiKey: 'k',
      clientId: 'c',
      clientSecret: 's',
      credentialsFile: '',
      verbose: false,
      yes: true,
    });

    expect(mockState.api.toggleCode).toHaveBeenCalledWith('default-card-key', false);
    expect(console.log).toHaveBeenCalledWith('✅ code disabled successfully');
  });
});
