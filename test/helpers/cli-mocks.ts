/// <reference types="vitest" />
/**
 * Shared Vitest stubs for `runtime-credentials`. Use with an **async** `vi.mock` factory
 * so the helper resolves after hoist (see Vitest “mock hoisting” docs).
 *
 * @example
 * vi.mock('../../src/runtime-credentials.ts', async () => {
 *   const { getRuntimeCredentialsMock } = await import('../helpers/cli-mocks.js');
 *   return getRuntimeCredentialsMock({ emptyCredentials: true });
 * });
 */

import { vi } from 'vitest';
import type { Credentials } from '../../src/cmds/types.js';

/** Default credential shape for command tests (matches many existing inline mocks). */
export const testCredentials: Credentials = {
  host: 'https://openapi.investec.com',
  clientId: 'cid',
  clientSecret: 'secret',
  apiKey: 'key',
  cardKey: '123',
  openaiKey: '',
  sandboxKey: '',
};

export type RuntimeCredentialsMockOptions = {
  /** Use `{}` as credentials (common for list-style commands that mock the API only). */
  emptyCredentials?: boolean;
  credentials?: Partial<Credentials>;
  credentialLocation?: { folder: string; filename: string };
};

/**
 * Builds the object passed to `vi.mock('../../src/runtime-credentials.ts', () => …)`.
 * Returns fresh `vi.fn` instances per call so each test file gets isolated spies.
 */
export function getRuntimeCredentialsMock(options?: RuntimeCredentialsMockOptions) {
  const credentials: Credentials = options?.emptyCredentials
    ? ({} as Credentials)
    : { ...testCredentials, ...options?.credentials };

  const mock: Record<string, unknown> = {
    credentials,
    printTitleBox: vi.fn(),
    optionCredentials: vi.fn(async (_o: unknown, c: Credentials) => c),
  };

  if (options?.credentialLocation !== undefined) {
    mock.credentialLocation = options.credentialLocation;
  }

  return mock;
}

/** Spinner object returned by mocked `createSpinner` in command tests. */
export function createSpinnerControlMock() {
  return {
    start: vi.fn(function (this: unknown) {
      return this;
    }),
    stop: vi.fn(),
    clear: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  };
}
