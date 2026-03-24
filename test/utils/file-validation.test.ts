/// <reference types="vitest" />

import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import {
  normalizeFilePath,
  validateFileExtension,
  validateFilePath,
  validateFilePathForWrite,
} from '../../src/utils/file-validation.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

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

  it('throws when target file exists but is not writable', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ipb-test-write-perms-'));
    tempDirs.push(tempDir);
    const targetFile = path.join(tempDir, 'readonly.js');
    await writeFile(targetFile, 'console.log("test");', 'utf8');
    await chmod(targetFile, 0o444);

    await expect(validateFilePathForWrite(targetFile, ['.js'])).rejects.toThrow(CliError);

    await chmod(targetFile, 0o644);
  });
});
