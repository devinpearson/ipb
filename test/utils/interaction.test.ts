/// <reference types="vitest" />

import os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  confirmDestructiveOperation,
  getTempDir,
  pageOutput,
} from '../../src/utils/interaction.js';

describe('interaction utilities', () => {
  it('returns OS temp directory', () => {
    expect(getTempDir()).toBe(os.tmpdir());
  });

  it('writes to stdout when output is piped', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await pageOutput('hello', { isPiped: true });
    expect(writeSpy).toHaveBeenCalledWith('hello');
    writeSpy.mockRestore();
  });

  it('auto-confirms destructive action with yes option', async () => {
    await expect(confirmDestructiveOperation('continue?', { yes: true })).resolves.toBe(true);
  });

  it('returns false in non-interactive mode without yes', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    await expect(confirmDestructiveOperation('continue?')).resolves.toBe(false);
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
  });
});
