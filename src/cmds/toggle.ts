import { credentials, printTitleBox } from '../runtime-credentials.js';
import {
  createSpinner,
  initializeApi,
  isStdoutPiped,
  normalizeCardKey,
  resolveSpinnerState,
  withSpinner,
} from '../utils.js';
import type { CommonOptions } from './types.js';

interface Options extends CommonOptions {
  cardKey?: string | number;
}

/**
 * Enables code on a programmable card.
 * @param options - CLI options including card key and API credentials
 * @throws {CliError} When card key is missing or API call fails
 */
export async function enableCommand(options: Options) {
  const cardKey = normalizeCardKey(options.cardKey, credentials.cardKey);
  printTitleBox();
  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '🍄 enabling code on card...');
  let result:
    | {
        data: {
          result: {
            Enabled: boolean;
          };
        };
      }
    | undefined;
  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeApi(credentials, options);
    result = await api.toggleCode(cardKey, true);
  });

  if (!result) {
    return;
  }
  if (result.data.result.Enabled) {
    console.log('✅ code enabled');
  } else {
    console.log('❌ code enable failed');
  }
}
