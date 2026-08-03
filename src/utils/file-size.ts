import fs from 'node:fs';

/**
 * Formats file size in bytes to human-readable format.
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / k ** i;
  const rounded = i === 0 ? Math.round(size) : Math.round(size * 10) / 10;

  return `${rounded} ${sizes[i]}`;
}

/**
 * Gets the size of a file in bytes.
 * @param filepath - Path to the file
 * @returns File size in bytes
 */
export async function getFileSize(filepath: string): Promise<number> {
  const stats = await fs.promises.stat(filepath);
  return stats.size;
}
