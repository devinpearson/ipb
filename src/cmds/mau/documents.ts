import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  createSpinner,
  initializeMauApi,
  isStdoutPiped,
  resolveSpinnerState,
  runListCommand,
  validateDateRange,
  validateMauAccountId,
  withRetry,
  withSpinner,
} from '../../utils.js';
import type { MauOptions } from '../types.js';
import { resolveMauAccountId } from './helpers.js';

interface MauDocumentsOptions extends MauOptions {
  from?: string;
  to?: string;
}

/**
 * List available Mauritius (MAU) account documents for a date range.
 * @param accountId - MAU account ID
 * @param options - CLI options including --from / --to
 */
export async function mauDocumentsCommand(accountId: string, options: MauDocumentsOptions) {
  const isPiped = isStdoutPiped();
  const resolvedId = validateMauAccountId(await resolveMauAccountId(accountId));
  const { fromDate, toDate } = validateDateRange(options.from, options.to);

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching MAU documents...');
  let documents:
    | Array<{
        documentDate: string;
        documentType: string;
        accountNumber: string;
      }>
    | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeMauApi(credentials, options);
    const result = await withRetry(() => api.getAccountDocuments(resolvedId, fromDate, toDate), {
      maxRetries: 3,
      verbose,
    });
    const accountNumber = result.availableDocuments.accountNumber;
    documents = result.availableDocuments.documentInformation.map((doc) => ({
      documentDate: doc.documentDate,
      documentType: doc.documentType,
      accountNumber,
    }));
  });

  await runListCommand({
    isPiped,
    items: documents,
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No MAU documents found',
    countMessage: (count) => `${count} MAU document(s) found.`,
    mapSimple: (rows) =>
      rows.map(({ documentDate, documentType, accountNumber }) => ({
        documentDate,
        documentType,
        accountNumber,
      })),
  });
}
