import { credentials, printTitleBox } from '../index.js';
import {
  confirmDestructiveOperation,
  createSpinner,
  initializeApi,
  normalizeCardKey,
  resolveSpinnerState,
  stopSpinner,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
}

/**
 * Disables code on a programmable card.
 * @param options - CLI options including card key and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function disableCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();

  // Require confirmation before disabling (deactivates code)
  const confirmed = await confirmDestructiveOperation(
    `This will disable programmable code on card ${cardKey}. Code will remain deployed but inactive. Continue?`,
    { yes: options.yes }
  );

  if (!confirmed) {
    console.log('Disable cancelled.');
    return;
  }

  const { isStdoutPiped } = await import('../utils.js');
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🍄 disabling code on card...');
  if (spinnerEnabled) {
    spinner.start();
  }
  try {
    const api = await initializeApi(credentials, options);

    const result = await api.toggleCode(cardKey, false);
    if (!result.data.result.Enabled) {
      console.log('✅ code disabled successfully');
    } else {
      console.log('❌ code disable failed');
    }
  } finally {
    stopSpinner(spinner, spinnerEnabled);
  }
}
