/// <reference types="vitest" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectSecretUsageFromEnv,
  isNonInteractiveEnvironment,
  warnAboutSecretUsage,
} from '../../src/utils/security.js';

describe('security utilities', () => {
  afterEach(() => {
    delete process.env.INVESTEC_CLIENT_SECRET;
    delete process.env.INVESTEC_API_KEY;
    delete process.env.INVESTEC_CARD_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.SANDBOX_KEY;
    delete process.env.CI;
    vi.restoreAllMocks();
  });

  it('detects secrets loaded from environment variables', () => {
    process.env.INVESTEC_API_KEY = 'abc123';
    process.env.OPENAI_API_KEY = 'def456';

    const result = detectSecretUsageFromEnv();

    expect(result.hasSecretsFromEnv).toBe(true);
    expect(result.secretsFromEnv).toContain('INVESTEC_API_KEY');
    expect(result.secretsFromEnv).toContain('OPENAI_API_KEY');
  });

  it('returns false when no secrets are loaded', () => {
    const result = detectSecretUsageFromEnv();
    expect(result.hasSecretsFromEnv).toBe(false);
    expect(result.secretsFromEnv).toEqual([]);
  });

  it('identifies CI as non-interactive', () => {
    process.env.CI = '1';
    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it('warns when forced and secrets are present', () => {
    process.env.INVESTEC_CLIENT_SECRET = 'secret';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const didWarn = warnAboutSecretUsage({ force: true });

    expect(didWarn).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });
});
