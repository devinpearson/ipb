import { writeFile } from 'node:fs/promises';
import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  createSpinner,
  getSafeText,
  initializeMauApi,
  isStdoutPiped,
  resolveSpinnerState,
  validateFilePathForWrite,
  validateIsoDate,
  validateMauAccountId,
  withRetry,
  withSpinner,
} from '../../utils.js';
import type { MauOptions } from '../types.js';
import { resolveMauAccountId } from './helpers.js';

interface MauStatementOptions extends MauOptions {
  output?: string;
}

/**
 * Download a Mauritius (MAU) account statement PDF.
 * @param accountId - MAU account ID
 * @param documentDate - Statement document date (YYYY-MM-DD)
 * @param options - CLI options including optional --output path
 */
export async function mauStatementCommand(
  accountId: string,
  documentDate: string,
  options: MauStatementOptions
) {
  const isPiped = isStdoutPiped();
  const resolvedId = validateMauAccountId(await resolveMauAccountId(accountId));
  const date = validateIsoDate(documentDate, 'documentDate');
  const defaultPath = `statement-${resolvedId}-${date}.pdf`;
  const outputPath = await validateFilePathForWrite(options.output || defaultPath, ['.pdf']);

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 downloading MAU statement...');

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeMauApi(credentials, options);
    const pdf = await withRetry(() => api.downloadAccountStatement(resolvedId, date), {
      maxRetries: 3,
      verbose,
    });
    await writeFile(outputPath, Buffer.from(pdf));
  });

  console.log(getSafeText(`✅ Statement saved to ${outputPath}`));
}
