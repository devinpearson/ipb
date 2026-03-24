/**
 * Checks if DEBUG environment variable is set (supports common falsey values).
 * @returns True if DEBUG is effectively enabled
 */
export function isDebugEnabled(): boolean {
  const debug = process.env.DEBUG;
  if (debug === undefined || debug === '') {
    return false;
  }
  const normalized = debug.trim().toLowerCase();
  const falseValues = new Set(['0', 'false', 'off', 'no', 'disabled']);
  return !falseValues.has(normalized);
}

/**
 * Gets the effective verbose setting, checking both --verbose flag and DEBUG env var.
 * @param verboseFlag - Value from --verbose flag (can be undefined)
 * @returns True if verbose mode should be enabled
 */
export function getVerboseMode(verboseFlag?: boolean): boolean {
  if (verboseFlag !== undefined) {
    return verboseFlag;
  }
  return isDebugEnabled();
}

/**
 * Resolves spinner and verbose state from command flags and output mode.
 * @param options - Spinner/verbose/piped options
 * @returns Spinner enabled and verbose flags
 */
export function resolveSpinnerState({
  spinnerFlag,
  verboseFlag,
  isPiped,
}: {
  spinnerFlag?: boolean;
  verboseFlag?: boolean;
  isPiped: boolean;
}): { spinnerEnabled: boolean; verbose: boolean } {
  const verbose = getVerboseMode(verboseFlag);
  const spinnerEnabled = !isPiped && spinnerFlag !== true && !verbose;
  return { spinnerEnabled, verbose };
}
