import { writeFile } from 'node:fs/promises';
import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  getSafeText,
  initializeMauApi,
  isStdoutPiped,
  validateFilePathForWrite,
  validateIsoDate,
  validateMauAccountId,
  withCommandSpinner,
  withRetry,
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

  await withCommandSpinner(options, isPiped, '💳 downloading MAU statement...', async (verbose) => {
    const api = await initializeMauApi(credentials, options);
    const pdf = await withRetry(() => api.downloadAccountStatement(resolvedId, date), { verbose });
    await writeFile(outputPath, Buffer.from(pdf), { mode: 0o600 });
  });

  console.log(getSafeText(`✅ Statement saved to ${outputPath}`));
}
