export interface TerminalCapabilities {
  supportsUnicode: boolean;
  supportsEmoji: boolean;
  termType: string | null;
}

const EMOJI_FALLBACKS: Record<string, string> = {
  '💳': '[CARD]',
  '💎': '[ENV]',
  '🚀': '[DEPLOY]',
  '📦': '[UPLOAD]',
  '🎉': '[OK]',
  '📖': '[READ]',
  '💾': '[SAVE]',
  '🔑': '[KEY]',
  '✅': '[OK]',
  '⚠️': '[WARN]',
  '🙀': '[ERROR]',
  '💻': '[CODE]',
  '📂': '[DIR]',
  '💣': '[ERR]',
  '📝': '[EDIT]',
  '🧪': '[TEST]',
};

let terminalCapabilitiesCache: TerminalCapabilities | null = null;

/**
 * Gets terminal dimensions from env vars or stdout TTY values.
 * @returns Object with terminal lines/columns, or null
 */
export function getTerminalDimensions(): { lines: number; columns: number } | null {
  const lines = process.env.LINES ? parseInt(process.env.LINES, 10) : null;
  const columns = process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : null;

  if (lines !== null && columns !== null && !Number.isNaN(lines) && !Number.isNaN(columns)) {
    return { lines, columns };
  }

  if (process.stdout.isTTY && process.stdout.rows && process.stdout.columns) {
    return {
      lines: process.stdout.rows,
      columns: process.stdout.columns,
    };
  }

  return null;
}

/**
 * Detects terminal Unicode/emoji support.
 * @returns Terminal capability info
 */
export function detectTerminalCapabilities(): TerminalCapabilities {
  const term = process.env.TERM;
  const isTTY = process.stdout.isTTY === true;

  if (!isTTY) {
    return {
      supportsUnicode: false,
      supportsEmoji: false,
      termType: term || null,
    };
  }

  const termLower = term?.toLowerCase() || '';
  const noUnicodeTerms = ['dumb', 'vt220', 'vt100', 'vt102', 'ansi'];
  const likelyNoUnicode = noUnicodeTerms.some((t) => termLower.includes(t));
  const noColor = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';
  const supports256Colors =
    termLower.includes('256color') ||
    termLower.includes('truecolor') ||
    termLower.includes('kitty') ||
    termLower.includes('iterm') ||
    termLower.includes('alacritty') ||
    termLower.includes('wezterm');

  const supportsUnicode = !likelyNoUnicode && !noColor && (supports256Colors || term === undefined);
  const modernTerms = ['kitty', 'iterm', 'alacritty', 'wezterm', 'foot', 'rio'];
  const supportsEmoji =
    supportsUnicode &&
    (modernTerms.some((t) => termLower.includes(t)) ||
      termLower.includes('256color') ||
      term === undefined);

  return {
    supportsUnicode,
    supportsEmoji,
    termType: term || null,
  };
}

/**
 * Converts emoji text to ASCII when terminal support is limited.
 * @param text - Text that may include emojis
 * @param options - Output options
 * @returns Safe terminal text
 */
export function getSafeText(text: string, options: { forceASCII?: boolean } = {}): string {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') {
    options.forceASCII = true;
  }

  if (options.forceASCII) {
    let result = text;
    for (const [emoji, fallback] of Object.entries(EMOJI_FALLBACKS)) {
      result = result.replace(new RegExp(emoji, 'g'), fallback);
    }
    return result;
  }

  const capabilities = detectTerminalCapabilities();
  if (!capabilities.supportsEmoji) {
    let result = text;
    for (const [emoji, fallback] of Object.entries(EMOJI_FALLBACKS)) {
      result = result.replace(new RegExp(emoji, 'g'), fallback);
    }
    return result;
  }

  return text;
}

/**
 * Gets cached terminal capabilities or detects them.
 * @returns Terminal capability information
 */
export function getTerminalCapabilities(): TerminalCapabilities {
  if (terminalCapabilitiesCache === null) {
    terminalCapabilitiesCache = detectTerminalCapabilities();
  }
  return terminalCapabilitiesCache;
}

/**
 * Logs with automatic safe text conversion.
 * @param message - Message to log
 * @param args - Additional args for console.log
 */
export function safeLog(message: string, ...args: unknown[]): void {
  const safeMessage = getSafeText(message);
  console.log(safeMessage, ...args);
}

/**
 * Checks if stdout is piped (not a TTY).
 * @returns True if stdout is piped
 */
export function isStdoutPiped(): boolean {
  return !process.stdout.isTTY && process.stdout.writable;
}

/**
 * Checks if stdin has data piped in.
 * @returns True if stdin is piped
 */
export function isStdinPiped(): boolean {
  return !process.stdin.isTTY && process.stdin.readable;
}

/**
 * Reads stdin data if available.
 * @returns Piped stdin contents or null
 */
export async function readStdin(): Promise<string | null> {
  if (!isStdinPiped()) {
    return null;
  }

  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim() || null);
    });

    setTimeout(() => {
      if (!data) {
        resolve(null);
      }
    }, 100);
  });
}
