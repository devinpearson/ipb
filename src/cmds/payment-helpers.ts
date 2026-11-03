import chalk from 'chalk';
import { CliError, ERROR_CODES } from '../errors.js';
import type { IPbApi } from '../mock-pb.js';

interface TransferResult {
  PaymentReferenceNumber: string;
  PaymentDate: string;
  Status: string;
  BeneficiaryName: string;
  BeneficiaryAccountId: string;
  AuthorisationRequired: boolean;
}

type PartyLookup = { label: string } | { label: null };

function bracketId(id: string): string {
  return chalk.dim(`[${id}]`);
}

/**
 * Resolves the user's own accounts to readable labels, in the order given.
 * Throws when an ID is not one of the user's accounts.
 */
export async function describeOwnAccounts(api: IPbApi, accountIds: string[]): Promise<string[]> {
  const result = await api.getAccounts();
  return accountIds.map((accountId) => {
    const account = result.data.accounts.find((a) => a.accountId === accountId);
    if (!account) {
      throw new CliError(
        ERROR_CODES.INVALID_INPUT,
        `Account ${accountId} is not one of your accounts. Run \`ipb accounts\` to list valid account IDs.`
      );
    }
    const name = account.referenceName || account.accountName;
    return `${name} (${account.productName}, ${account.accountNumber}) ${bracketId(accountId)}`;
  });
}

/**
 * Resolves a beneficiary ID to a readable label.
 * Throws when the beneficiary list is complete and the ID is not in it.
 */
export async function describeBeneficiary(
  api: IPbApi,
  beneficiaryId: string
): Promise<PartyLookup> {
  const result = await api.getBeneficiaries();
  const beneficiary = result.data.find((b) => b.beneficiaryId === beneficiaryId);
  if (beneficiary) {
    const name = beneficiary.beneficiaryName || beneficiary.name;
    const bank = beneficiary.bank ? `${beneficiary.bank}, ` : '';
    return { label: `${name} (${bank}${beneficiary.accountNumber}) ${bracketId(beneficiaryId)}` };
  }
  // The list may be paginated; only reject when we know we saw every beneficiary.
  if ((result.meta?.totalPages ?? 1) <= 1) {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `Beneficiary ${beneficiaryId} was not found on your profile. Run \`ipb beneficiaries\` to list valid beneficiary IDs.`
    );
  }
  return { label: null };
}

/** Investec returns statuses like "- No authorisation necessary <br> - Payment/Transfer effective date 2024-01-01". */
export function cleanStatus(status: string | undefined): string {
  if (!status) {
    return '';
  }
  return status
    .split(/<br\s*\/?>/i)
    .map((part) => part.trim().replace(/^-\s*/, ''))
    .filter(Boolean)
    .join('; ');
}

/**
 * Prints the bank's response for each payment/transfer and throws if any was not confirmed.
 * @param responses - TransferResponses from the API
 * @param kind - Wording for messages
 */
export function reportTransferResults(
  responses: TransferResult[] | undefined,
  kind: 'Payment' | 'Transfer'
): void {
  if (!responses || responses.length === 0) {
    throw new CliError(
      ERROR_CODES.PAYMENT_NOT_CONFIRMED,
      `${kind} not confirmed: the bank returned no result. Check \`ipb transactions\` before retrying.`
    );
  }

  let unconfirmed = 0;
  for (const r of responses) {
    const to = r.BeneficiaryName || r.BeneficiaryAccountId;
    const status = cleanStatus(r.Status);

    if (!r.PaymentReferenceNumber) {
      unconfirmed++;
      console.log(chalk.red(`✖ ${kind} to ${to} was not confirmed by the bank.`));
      if (status) {
        console.log(`  Status: ${status}`);
      }
      continue;
    }

    if (r.AuthorisationRequired) {
      console.log(
        chalk.yellow(
          `⚠ ${kind} to ${to} needs your approval (reference ${r.PaymentReferenceNumber}).`
        )
      );
      console.log(
        chalk.yellow('  Approve it in the Investec app — it will not go through until you do.')
      );
    } else {
      console.log(
        chalk.green(`✔ ${kind} to ${to} accepted (reference ${r.PaymentReferenceNumber}).`)
      );
    }
    if (status) {
      console.log(`  Status: ${status}`);
    }
  }

  if (unconfirmed > 0) {
    throw new CliError(
      ERROR_CODES.PAYMENT_NOT_CONFIRMED,
      `${unconfirmed} ${kind.toLowerCase()}(s) not confirmed by the bank. Check \`ipb transactions\` before retrying.`
    );
  }
}
