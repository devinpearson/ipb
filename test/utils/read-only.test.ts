/// <reference types="vitest" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors.js';

const mockCredentials = vi.hoisted(() => ({ readOnly: '' as string | undefined }));

vi.mock('../../src/runtime-credentials.ts', () => ({
  credentials: {},
  optionCredentials: vi.fn(async () => ({ readOnly: mockCredentials.readOnly })),
}));

const { assertWritable, guardWrites, isReadOnlyValue, readOnlyReason } = await import(
  '../../src/utils/read-only.js'
);

const isReadOnlyError = (err: unknown) =>
  err instanceof CliError && err.code === ERROR_CODES.READ_ONLY;

afterEach(() => {
  delete process.env.IPB_READ_ONLY;
  mockCredentials.readOnly = '';
});

describe('isReadOnlyValue', () => {
  it('accepts true and "true" only', () => {
    expect(isReadOnlyValue(true)).toBe(true);
    expect(isReadOnlyValue('true')).toBe(true);
    for (const value of [false, 'false', '', '1', 'yes', undefined, null]) {
      expect(isReadOnlyValue(value)).toBe(false);
    }
  });
});

describe('readOnlyReason', () => {
  it('is null when neither the environment nor credentials ask for it', () => {
    expect(readOnlyReason({})).toBeNull();
    expect(readOnlyReason({ readOnly: 'false' })).toBeNull();
  });

  it('names the environment variable first', () => {
    process.env.IPB_READ_ONLY = '1';
    expect(readOnlyReason({ readOnly: 'true' })).toBe('IPB_READ_ONLY is set');
  });

  it('treats falsey environment values as off', () => {
    process.env.IPB_READ_ONLY = 'false';
    expect(readOnlyReason({})).toBeNull();
  });

  it('names the credentials when they turn it on', () => {
    expect(readOnlyReason({ readOnly: 'true' })).toBe(
      'readOnly is set in your credentials or profile'
    );
  });
});

describe('assertWritable', () => {
  it('passes when read-only mode is off', async () => {
    await expect(assertWritable('ipb pay', {} as never)).resolves.toBeUndefined();
  });

  it('blocks when IPB_READ_ONLY is set, naming the action and how to turn it off', async () => {
    process.env.IPB_READ_ONLY = 'true';
    await expect(assertWritable('ipb pay', {} as never)).rejects.toSatisfy(
      (err: unknown) =>
        isReadOnlyError(err) &&
        (err as Error).message.includes('ipb pay is blocked because read-only mode is on') &&
        (err as Error).message.includes('ipb config --no-read-only')
    );
  });

  it('blocks when the resolved credentials or profile are read-only', async () => {
    mockCredentials.readOnly = 'true';
    await expect(assertWritable('ipb deploy', {} as never)).rejects.toSatisfy(
      (err: unknown) =>
        isReadOnlyError(err) && (err as Error).message.includes('credentials or profile')
    );
  });
});

describe('guardWrites', () => {
  class Client {
    #token = 'secret';
    readToken() {
      return this.#token;
    }
    async payMultiple() {
      return 'paid';
    }
    async getAccounts() {
      return ['acc'];
    }
  }

  it('returns the client untouched when read-only mode is off', () => {
    const client = new Client();
    expect(guardWrites(client, ['payMultiple'], {})).toBe(client);
  });

  it('rejects listed write methods with READ_ONLY', async () => {
    const guarded = guardWrites(new Client(), ['payMultiple'], { readOnly: 'true' });
    await expect(guarded.payMultiple()).rejects.toSatisfy(
      (err: unknown) =>
        isReadOnlyError(err) && (err as Error).message.includes('payMultiple is blocked')
    );
  });

  it('keeps reads working, including methods that use #private fields', async () => {
    const guarded = guardWrites(new Client(), ['payMultiple'], { readOnly: 'true' });
    await expect(guarded.getAccounts()).resolves.toEqual(['acc']);
    expect(guarded.readToken()).toBe('secret');
  });

  it('applies when only IPB_READ_ONLY is set', async () => {
    process.env.IPB_READ_ONLY = '1';
    const guarded = guardWrites(new Client(), ['payMultiple'], {});
    await expect(guarded.payMultiple()).rejects.toSatisfy(isReadOnlyError);
  });
});

describe('API clients in read-only mode', () => {
  afterEach(() => {
    delete process.env.IPB_MOCK_APIS;
  });

  const readOnlyCreds = {
    host: 'h',
    clientId: 'c',
    clientSecret: 's',
    apiKey: 'k',
    cardKey: '1',
    openaiKey: '',
    sandboxKey: '',
    mauHost: '',
    mauClientId: '',
    mauClientSecret: '',
    mauApiKey: '',
    readOnly: 'true',
  };

  it('block payments and card code changes but not reads', async () => {
    process.env.IPB_MOCK_APIS = '1';
    vi.resetModules();
    vi.doMock('../../src/runtime-credentials.ts', () => ({
      credentials: {},
      optionCredentials: vi.fn(async (_o: unknown, c: unknown) => c),
      optionMauCredentials: vi.fn(async (_o: unknown, c: unknown) => c),
    }));
    const { initializeApi, initializePbApi } = await import('../../src/utils/api.js');
    // resetModules loads a fresh errors module, so compare codes rather than classes.
    const isReadOnlyError = (err: unknown) =>
      (err as { code?: string }).code === ERROR_CODES.READ_ONLY;

    const pb = await initializePbApi(readOnlyCreds, {} as never);
    await expect(pb.payMultiple('a', [])).rejects.toSatisfy(isReadOnlyError);
    await expect(pb.transferMultiple('a', [])).rejects.toSatisfy(isReadOnlyError);
    await expect(pb.getAccounts()).resolves.toHaveProperty('data.accounts');

    const card = await initializeApi(readOnlyCreds, {} as never);
    for (const call of [
      () => card.uploadCode(1, {}),
      () => card.uploadPublishedCode(1, 'c', ''),
      () => card.uploadEnv(1, {}),
      () => card.toggleCode(1, true),
    ]) {
      await expect(call()).rejects.toSatisfy(isReadOnlyError);
    }
    await expect(card.getCards()).resolves.toBeDefined();
  });
});
