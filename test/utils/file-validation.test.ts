/// <reference types="vitest" />

import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import {
  normalizeFilePath,
  validateFileExtension,
  validateFilePath,
  validateFilePathForWrite,
} from '../../src/utils/file-validation.js';

describe('file-validation utilities', () => {
  it('normalizes home-relative paths', () => {
    const normalized = normalizeFilePath('~/tmp/test.js');
    expect(normalized.startsWith(os.homedir())).toBe(true);
  });

  it('rejects invalid file extensions', () => {
    expect(() => validateFileExtension('/tmp/code.ts', ['.js'], 'read')).toThrow(CliError);
  });

  it('throws for empty read path', async () => {
    await expect(validateFilePath('')).rejects.toMatchObject({
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it('throws for missing parent directory on write', async () => {
    const missingDirFile = path.join('/tmp', 'ipb-test-missing-dir', 'nested', 'code.js');
    await expect(validateFilePathForWrite(missingDirFile, ['.js'])).rejects.toThrow(CliError);
  });
});
