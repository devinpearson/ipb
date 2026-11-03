/**
 * Normalizes legacy spinner flags for backwards compatibility.
 * Maps deprecated `-s` to `--no-spinner` and tracks usage.
 * @param argv - Raw CLI argv
 * @returns Normalized argv and deprecation indicator
 */
export function normalizeSpinnerFlags(argv: string[]): {
  argv: string[];
  usedDeprecatedSpinnerFlag: boolean;
} {
  const normalized = [...argv];
  const usedDeprecatedSpinnerFlag = normalized.includes('-s');

  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '-s') {
      normalized[i] = '--no-spinner';
    }
  }

  return { argv: normalized, usedDeprecatedSpinnerFlag };
}
