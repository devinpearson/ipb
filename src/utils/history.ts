import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { writeFileAtomic } from './credentials-store.js';

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
function getHistoryFilePath(): string {
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
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    } else {
      // History holds account IDs, amounts and references; earlier versions left ~/.ipb at 755.
      fs.chmodSync(dir, 0o700);
    }
    const trimmedHistory = history.slice(-1000);
    const jsonData = JSON.stringify(trimmedHistory, null, 2);
    await writeFileAtomic(historyPath, jsonData, { permissions: 0o600 });
  } catch {
    // Ignore errors writing history
  }
}

const MASK = '***';

/** Option and setting names whose values must never reach the history file. */
const SENSITIVE_NAME =
  /(client[-_]?id|secret|api[-_]?key|openai[-_]?key|sandbox[-_]?key|card[-_]?key|password|token|auth|credential|key)/i;

function isSensitiveName(name: string): boolean {
  // Earlier versions stored flags half-masked (e.g. "--cl***cret"); treat those as sensitive too.
  return SENSITIVE_NAME.test(name) || name.includes(MASK);
}

function sanitizeOptions(options: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    const hasValue =
      value !== undefined && value !== null && value !== '' && typeof value !== 'boolean';
    sanitized[key] = hasValue && isSensitiveName(key) ? MASK : value;
  }
  return sanitized;
}

/**
 * Masks secret values in raw command-line args: the value after a sensitive flag
 * (`--client-secret abc`), and the value part of `--client-secret=abc` or `API_KEY=abc`.
 */
function sanitizeArgs(args: string[]): string[] {
  const sanitized: string[] = [];
  let maskNext = false;

  for (const arg of args) {
    if (maskNext && !arg.startsWith('-')) {
      sanitized.push(MASK);
      maskNext = false;
      continue;
    }
    maskNext = false;

    const equalsIndex = arg.indexOf('=');
    const name = equalsIndex > 0 ? arg.slice(0, equalsIndex) : arg;
    if (equalsIndex > 0 && isSensitiveName(name)) {
      sanitized.push(`${name}=${MASK}`);
    } else {
      sanitized.push(arg);
      maskNext = arg.startsWith('-') && isSensitiveName(name);
    }
  }

  return sanitized;
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
    // Re-mask older entries too, so secrets logged by earlier versions are scrubbed.
    const history = readCommandHistory().map((old) => ({
      ...old,
      args: sanitizeArgs(Array.isArray(old.args) ? old.args : []),
      options: sanitizeOptions(old.options ?? {}),
    }));
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
