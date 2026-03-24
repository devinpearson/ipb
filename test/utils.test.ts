/// <reference types="vitest" />

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES } from '../src/errors.ts';

vi.mock('../src/index.ts', () => ({
  credentialLocation: {
    folder: '/tmp/.ipb',
    filename: '/tmp/.ipb/.credentials.json',
  },
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

let isDebugEnabled: typeof import('../src/utils.ts').isDebugEnabled;
let normalizeInvestecError: typeof import('../src/utils.ts').normalizeInvestecError;
let resolveSpinnerState: typeof import('../src/utils.ts').resolveSpinnerState;
let stopSpinner: typeof import('../src/utils.ts').stopSpinner;

beforeAll(async () => {
  const utils = await import('../src/utils.ts');
  isDebugEnabled = utils.isDebugEnabled;
  normalizeInvestecError = utils.normalizeInvestecError;
  resolveSpinnerState = utils.resolveSpinnerState;
  stopSpinner = utils.stopSpinner;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('isDebugEnabled', () => {
  afterEach(() => {
    delete process.env.DEBUG;
  });

  it('returns false when DEBUG is unset or empty', () => {
    delete process.env.DEBUG;
    expect(isDebugEnabled()).toBe(false);

    process.env.DEBUG = '';
    expect(isDebugEnabled()).toBe(false);
  });

  it('returns false for common falsey debug values', () => {
    process.env.DEBUG = 'false';
    expect(isDebugEnabled()).toBe(false);

    process.env.DEBUG = '0';
    expect(isDebugEnabled()).toBe(false);

    process.env.DEBUG = 'off';
    expect(isDebugEnabled()).toBe(false);
  });

  it('returns true for truthy debug values', () => {
    process.env.DEBUG = 'true';
    expect(isDebugEnabled()).toBe(true);

    process.env.DEBUG = '1';
    expect(isDebugEnabled()).toBe(true);
  });
});

describe('resolveSpinnerState', () => {
  afterEach(() => {
    delete process.env.DEBUG;
  });

  it('disables spinner when output is piped', () => {
    const state = resolveSpinnerState({
      spinnerFlag: false,
      verboseFlag: false,
      isPiped: true,
    });
    expect(state.spinnerEnabled).toBe(false);
  });

  it('disables spinner in verbose mode', () => {
    const state = resolveSpinnerState({
      spinnerFlag: false,
      verboseFlag: true,
      isPiped: false,
    });
    expect(state.spinnerEnabled).toBe(false);
    expect(state.verbose).toBe(true);
  });

  it('respects explicit spinner disable flag', () => {
    const state = resolveSpinnerState({
      spinnerFlag: true,
      verboseFlag: false,
      isPiped: false,
    });
    expect(state.spinnerEnabled).toBe(false);
  });
});

describe('stopSpinner', () => {
  it('stops spinner and writes trailing newline when enabled', () => {
    const spinner = {
      start: () => spinner,
      stop: vi.fn(() => spinner),
      clear: () => spinner,
      succeed: () => spinner,
      fail: () => spinner,
      text: '',
    };

    const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stopSpinner(spinner, true);

    expect(spinner.stop).toHaveBeenCalledTimes(1);
    expect(stderrWriteSpy.mock.calls.length + stdoutWriteSpy.mock.calls.length).toBeGreaterThan(0);

    stderrWriteSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  it('does nothing when spinner is disabled', () => {
    const spinner = {
      start: () => spinner,
      stop: vi.fn(() => spinner),
      clear: () => spinner,
      succeed: () => spinner,
      fail: () => spinner,
      text: '',
    };

    stopSpinner(spinner, false);
    expect(spinner.stop).not.toHaveBeenCalled();
  });
});

describe('normalizeInvestecError', () => {
  it('returns CliError unchanged', () => {
    const cliError = new CliError(ERROR_CODES.INVALID_INPUT, 'already normalized');
    const normalized = normalizeInvestecError(cliError, 'card-api-auth');
    expect(normalized).toBe(cliError);
  });

  it('normalizes axios-style errors with context message', () => {
    const error = Object.assign(new Error('request failed'), {
      response: {
        status: 503,
        statusText: 'Service Unavailable',
        data: { detail: 'Upstream timeout' },
      },
    });

    const normalized = normalizeInvestecError(error, 'pb-api-auth');
    expect(normalized).toBeInstanceOf(CliError);
    expect(normalized.code).toBe(ERROR_CODES.INVESTEC_API_ERROR);
    expect(normalized.message).toContain(
      'Failed to authenticate with the Investec Programmable Banking API'
    );
    expect(normalized.message).toContain('status 503');
  });
});
