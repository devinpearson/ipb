import { access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { CliError, ERROR_CODES } from '../errors.js';

export function normalizeFilePath(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    filePath = filePath.replace('~', homedir());
  }

  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  return path.normalize(filePath);
}

export function validateFileExtension(
  filePath: string,
  allowedExtensions: string[],
  operation: string = 'access'
): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Invalid file extension for ${operation} operation. Allowed extensions: ${allowedExtensions.join(', ')}. Got: ${ext || 'no extension'}`
    );
  }
}

export async function checkFilePermissions(
  filePath: string,
  operation: 'read' | 'write' = 'read'
): Promise<void> {
  const normalizedPath = normalizeFilePath(filePath);

  try {
    if (operation === 'read') {
      await access(normalizedPath, constants.R_OK);
    } else {
      const dir = path.dirname(normalizedPath);
      await access(dir, constants.W_OK);
      try {
        await access(normalizedPath, constants.F_OK);
        await access(normalizedPath, constants.W_OK);
      } catch {
        // File doesn't exist yet, fine for write.
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('ENOENT')) {
      if (operation === 'read') {
        throw new CliError(
          ERROR_CODES.FILE_NOT_FOUND,
          `File "${normalizedPath}" does not exist. Check the file path and ensure the file exists.`
        );
      }
      throw new CliError(
        ERROR_CODES.FILE_NOT_FOUND,
        `Directory "${path.dirname(normalizedPath)}" does not exist. Create the directory first.`
      );
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
      throw new CliError(
        ERROR_CODES.FILE_NOT_FOUND,
        `Permission denied: Cannot ${operation} file "${normalizedPath}". Check file permissions.`
      );
    }
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Cannot ${operation} file "${normalizedPath}": ${errorMessage}`
    );
  }
}

export async function validateFilePath(
  filePath: string,
  allowedExtensions?: string[]
): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File path is required and cannot be empty.');
  }

  const normalizedPath = normalizeFilePath(filePath);

  if (allowedExtensions && allowedExtensions.length > 0) {
    validateFileExtension(normalizedPath, allowedExtensions, 'read');
  }

  await checkFilePermissions(normalizedPath, 'read');
  return normalizedPath;
}

export async function validateFilePathForWrite(
  filePath: string,
  allowedExtensions?: string[]
): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, 'File path is required and cannot be empty.');
  }

  const normalizedPath = normalizeFilePath(filePath);

  if (allowedExtensions && allowedExtensions.length > 0) {
    validateFileExtension(normalizedPath, allowedExtensions, 'write');
  }

  await checkFilePermissions(normalizedPath, 'write');
  return normalizedPath;
}
