/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { shouldDisplayUpdateNotification, showUpdateNotification } from '../../src/utils/update.js';

describe('showUpdateNotification', () => {
  it('writes update notice to stderr instead of stdout', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    showUpdateNotification('0.1.0', '0.2.0');

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe('shouldDisplayUpdateNotification', () => {
  it('returns false for piped output', () => {
    expect(
      shouldDisplayUpdateNotification({
        isPiped: true,
      })
    ).toBe(false);
  });

  it('returns false for structured output modes', () => {
    expect(
      shouldDisplayUpdateNotification({
        isPiped: false,
        json: true,
      })
    ).toBe(false);

    expect(
      shouldDisplayUpdateNotification({
        isPiped: false,
        yaml: true,
      })
    ).toBe(false);

    expect(
      shouldDisplayUpdateNotification({
        isPiped: false,
        output: 'result.json',
      })
    ).toBe(false);
  });

  it('returns true for normal interactive output', () => {
    expect(
      shouldDisplayUpdateNotification({
        isPiped: false,
      })
    ).toBe(true);
  });
});

/**
 * Contract for `main()` in index.ts: background update checks must not call
 * `showUpdateNotification` when these modes are active (stdout reserved for command data).
 */
describe('update notification gate (automation / stdout contract)', () => {
  it.each([
    { label: 'piped stdout', options: { isPiped: true as const } },
    { label: '--json', options: { isPiped: false as const, json: true as const } },
    { label: '--yaml', options: { isPiped: false as const, yaml: true as const } },
    { label: '--output', options: { isPiped: false as const, output: 'report.json' as const } },
  ])('suppresses update banner for $label', ({ options }) => {
    expect(shouldDisplayUpdateNotification(options)).toBe(false);
  });

  it('allows update banner only for interactive, human-oriented terminal output', () => {
    expect(
      shouldDisplayUpdateNotification({
        isPiped: false,
        json: false,
        yaml: false,
      })
    ).toBe(true);
  });
});
