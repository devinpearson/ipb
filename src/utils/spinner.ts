import ora from 'ora';
import { getSafeText } from './terminal.js';

// Spinner abstraction for testability and control
export interface Spinner {
  start: (text?: string) => Spinner;
  stop: () => Spinner;
  clear: () => Spinner;
  succeed: (text?: string) => Spinner;
  fail: (text?: string) => Spinner;
  text?: string;
}

/**
 * Creates a spinner instance for displaying loading indicators.
 * @param enabled - Whether spinner should be animated
 * @param text - Initial spinner text
 * @returns A spinner instance
 */
export function createSpinner(enabled: boolean, text: string): Spinner {
  const safeText = getSafeText(text);

  if (!enabled) {
    return {
      start(_msg?: string) {
        return this;
      },
      stop() {
        return this;
      },
      clear() {
        return this;
      },
      succeed(_text?: string) {
        return this;
      },
      fail(_text?: string) {
        return this;
      },
    };
  }

  return ora({
    text: safeText,
    discardStdin: false,
    isEnabled: enabled && process.stderr.isTTY,
  });
}

/**
 * Stops a spinner and advances terminal cursor to the next line.
 * @param spinner - Spinner instance
 * @param enabled - Whether spinner was enabled
 */
export function stopSpinner(spinner: Spinner, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  spinner.stop();

  const stream = process.stderr.isTTY ? process.stderr : process.stdout;
  try {
    stream.write('\n');
  } catch {
    // Ignore stream write errors
  }
}

/**
 * Runs an async operation with spinner lifecycle management.
 * @param spinner - Spinner instance
 * @param enabled - Whether spinner is enabled
 * @param operation - Async operation to execute
 * @returns Operation result
 */
export async function withSpinner<T>(
  spinner: Spinner,
  enabled: boolean,
  operation: () => Promise<T>
): Promise<T> {
  if (enabled) {
    spinner.start();
  }

  try {
    return await operation();
  } finally {
    stopSpinner(spinner, enabled);
  }
}

/**
 * Runs an async operation and marks success/failure in spinner.
 * @param spinner - Spinner instance
 * @param enabled - Whether spinner is enabled
 * @param operation - Async operation to execute
 * @returns Operation result
 */
export async function withSpinnerOutcome<T>(
  spinner: Spinner,
  enabled: boolean,
  operation: () => Promise<T>
): Promise<T> {
  if (enabled) {
    spinner.start();
  }

  try {
    const result = await operation();
    if (enabled) {
      spinner.succeed();
    }
    return result;
  } catch (error) {
    if (enabled) {
      spinner.fail();
    }
    throw error;
  }
}
