import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { writeFileAtomic } from '../utils.js';

/**
 * Command history entry structure.
 */
export interface CommandHistoryEntry {
  timestamp: number;
  command: string;
  args: string[];
  options: Record<string, unknown>;
  exitCode: number;
  duration?: number;
}

/**
 * Gets the path to the command history file.
 * @returns Path to ~/.ipb/history.json
 */
export function getHistoryFilePath(): string {
  return path.join(homedir(), '.ipb', 'history.json');
}

/**
 * Reads the command history from the history file.
 * @returns Array of command history entries, or empty array if unavailable
 */
export function readCommandHistory(): CommandHistoryEntry[] {
  try {
    const historyPath = getHistoryFilePath();
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      const history = JSON.parse(data) as CommandHistoryEntry[];
      return Array.isArray(history) ? history : [];
    }
  } catch {
    // Ignore errors reading history
  }
  return [];
}

async function writeCommandHistory(history: CommandHistoryEntry[]): Promise<void> {
  try {
    const historyPath = getHistoryFilePath();
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const trimmedHistory = history.slice(-1000);
    const jsonData = JSON.stringify(trimmedHistory, null, 2);
    await writeFileAtomic(historyPath, jsonData);
  } catch {
    // Ignore errors writing history
  }
}

function sanitizeOptions(options: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = [
    'clientId',
    'clientSecret',
    'apiKey',
    'openaiKey',
    'sandboxKey',
    'cardKey',
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
  ];

  for (const [key, value] of Object.entries(options)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive && typeof value === 'string' && value.length > 0) {
      if (value.length > 8) {
        sanitized[key] = `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
      } else {
        sanitized[key] = '***';
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeArgs(args: string[]): string[] {
  return args.map((arg) => {
    if (
      arg.length > 20 &&
      (arg.includes('key') ||
        arg.includes('token') ||
        arg.includes('secret') ||
        arg.includes('password'))
    ) {
      return `${arg.substring(0, 4)}***${arg.substring(arg.length - 4)}`;
    }
    return arg;
  });
}

/**
 * Logs a command execution to the history file.
 * @param command - Command name
 * @param args - Command arguments
 * @param options - Command options (sanitized)
 * @param exitCode - Exit code
 * @param duration - Optional duration in ms
 */
export async function logCommandHistory(
  command: string,
  args: string[],
  options: Record<string, unknown>,
  exitCode: number,
  duration?: number
): Promise<void> {
  try {
    const history = readCommandHistory();
    const entry: CommandHistoryEntry = {
      timestamp: Date.now(),
      command,
      args: sanitizeArgs(args),
      options: sanitizeOptions(options),
      exitCode,
      duration,
    };
    history.push(entry);
    await writeCommandHistory(history);
  } catch {
    // Silent failure to avoid impacting command execution
  }
}
