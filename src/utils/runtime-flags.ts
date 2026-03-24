const TRUTHY_ENV_FALSE_VALUES = new Set(['0', 'false', 'off', 'no', 'disabled']);

/**
 * Returns true when an environment flag is set to a truthy value (empty and common falsey strings are false).
 */
function isTruthyEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return !TRUTHY_ENV_FALSE_VALUES.has(normalized);
}

/**
 * Checks if DEBUG environment variable is set (supports common falsey values).
 * @returns True if DEBUG is effectively enabled
 */
export function isDebugEnabled(): boolean {
  return isTruthyEnv(process.env.DEBUG);
}

/**
 * When true, the CLI uses in-process mock Programmable Banking and Card API clients (no network to Investec).
 * Enabled when DEBUG is set or `IPB_MOCK_APIS` is truthy; use the latter for tape generation without verbose output.
 */
export function isMockApisEnabled(): boolean {
  return isDebugEnabled() || isTruthyEnv(process.env.IPB_MOCK_APIS);
}

/**
 * When true, skips npm registry version checks (no network). Used for VHS tape generation and fully offline runs.
 */
export function isUpdateCheckDisabled(): boolean {
  return isTruthyEnv(process.env.IPB_NO_UPDATE_CHECK);
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
