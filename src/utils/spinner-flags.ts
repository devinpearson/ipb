/**
 * Normalizes spinner flags while preserving backwards compatibility.
 * Maps `--no-spinner` to legacy `--spinner` behavior and tracks deprecation usage.
 * @param argv - Raw CLI argv
 * @returns Normalized argv and deprecation indicator
 */
export function normalizeSpinnerFlags(argv: string[]): {
  argv: string[];
  usedDeprecatedSpinnerFlag: boolean;
} {
  const normalized = [...argv];
  const usedDeprecatedSpinnerFlag = normalized.includes('--spinner') || normalized.includes('-s');

  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '--no-spinner') {
      normalized[i] = '--spinner';
    }
  }

  return { argv: normalized, usedDeprecatedSpinnerFlag };
}
