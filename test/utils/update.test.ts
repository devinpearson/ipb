/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { showUpdateNotification } from '../../src/utils/update.js';

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
