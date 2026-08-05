import { credentials, printTitleBox } from '../../runtime-credentials.js';
import {
  createSpinner,
  initializeMauApi,
  isStdoutPiped,
  resolveSpinnerState,
  runListCommand,
  validateMauAccountId,
  withRetry,
  withSpinner,
} from '../../utils.js';
import type { MauOptions } from '../types.js';
import { extractMauRecord, resolveMauAccountId } from './helpers.js';

/**
 * Fetch and display Mauritius (MAU) account balances.
 * @param accountId - MAU account ID
 * @param options - CLI options including MAU credentials
 */
export async function mauBalancesCommand(accountId: string, options: MauOptions) {
  const isPiped = isStdoutPiped();
  const resolvedId = validateMauAccountId(await resolveMauAccountId(accountId));

  if (!isPiped) {
    printTitleBox();
  }
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, '💳 fetching MAU balances...');
  let balance:
    | {
        accountNumber: string;
        accountType: string;
        accountShortName: string;
        balance: number;
        availableBalance: number;
        encumbrances: number;
        currency: string;
        debitInterestRate: number;
        creditInterestRate: number;
        creditInterestAccrued: number;
        debitInterestAccrued: number;
        overDraftLimit?: number;
      }
    | undefined;

  await withSpinner(spinner, spinnerEnabled, async () => {
    const api = await initializeMauApi(credentials, options);
    const result = await withRetry(() => api.getAccountBalances(resolvedId), {
      maxRetries: 3,
      verbose,
    });
    balance = extractMauRecord(result);
  });

  if (!balance) {
    return;
  }

  await runListCommand({
    isPiped,
    items: [balance],
    outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
    emptyMessage: 'No MAU balances found',
    countMessage: () => '1 MAU balance record found.',
    mapSimple: (rows) =>
      rows.map((row) => ({
        accountNumber: row.accountNumber,
        accountType: row.accountType,
        accountShortName: row.accountShortName,
        currency: row.currency,
        balance: row.balance,
        availableBalance: row.availableBalance,
        encumbrances: row.encumbrances,
      })),
  });
}
