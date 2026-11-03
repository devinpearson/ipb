/// <reference types="vitest" />

import { Agent, fetch as undiciFetch } from 'undici';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAIClient } from '../../src/utils/openai-client';

const clientOptions = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor(options: Record<string, unknown>) {
      clientOptions.push(options);
    }
  },
}));

const credentials = vi.hoisted(() => ({ openaiKey: '', sandboxKey: '' }));
vi.mock('../../src/runtime-credentials.ts', () => ({ credentials }));

function create(keys: { openaiKey?: string; sandboxKey?: string }) {
  Object.assign(credentials, { openaiKey: '', sandboxKey: '', ...keys });
  clientOptions.length = 0;
  createOpenAIClient();
  return clientOptions[0];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createOpenAIClient', () => {
  it('uses the OpenAI key and the default API when there is one', () => {
    vi.stubEnv('REJECT_UNAUTHORIZED', 'false');

    expect(create({ openaiKey: 'sk-1', sandboxKey: 'sb' })).toEqual({ apiKey: 'sk-1' });
  });

  it('uses the sandbox proxy with certificate checks when there is no OpenAI key', () => {
    vi.stubEnv('REJECT_UNAUTHORIZED', '');

    expect(create({ sandboxKey: 'sb' })).toEqual({
      apiKey: 'sb',
      baseURL: 'https://ipb.sandboxpay.co.za/proxy/v1',
    });
  });

  it('turns off certificate checks for the sandbox proxy only with REJECT_UNAUTHORIZED=false', () => {
    vi.stubEnv('REJECT_UNAUTHORIZED', 'false');

    const options = create({ sandboxKey: 'sb' });

    expect(options).toMatchObject({
      apiKey: 'sb',
      baseURL: 'https://ipb.sandboxpay.co.za/proxy/v1',
      fetch: undiciFetch,
    });
    expect(options?.fetchOptions).toEqual({ dispatcher: expect.any(Agent) });
  });

  it.each(['true', '0', 'FALSE'])(
    'keeps certificate checks for REJECT_UNAUTHORIZED=%s',
    (value) => {
      vi.stubEnv('REJECT_UNAUTHORIZED', value);

      expect(create({ sandboxKey: 'sb' })).not.toHaveProperty('fetchOptions');
    }
  );
});
