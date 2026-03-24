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
