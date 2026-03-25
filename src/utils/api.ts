import type { BasicOptions, Credentials } from '../cmds/types.js';
import { CliError, ERROR_CODES } from '../errors.js';
import type { ICardApi } from '../mock-card.js';
import type { IPbApi } from '../mock-pb.js';
import { optionCredentials } from '../runtime-credentials.js';
import { validateCredentialsFile } from './credentials-validation.js';
import { normalizeInvestecError } from './investec-errors.js';
import { isMockApisEnabled } from './runtime-flags.js';

/**
 * Initializes the Programmable Banking API client.
 * @param credentials - API credentials
 * @param options - Basic options including credential overrides
 * @returns Initialized IPbApi instance
 */
export async function initializePbApi(
  credentials: Credentials,
  options: BasicOptions
): Promise<IPbApi> {
  credentials = await optionCredentials(options, credentials);
  validateCredentialsFile(credentials);

  let api: IPbApi;
  if (isMockApisEnabled()) {
    const { PbApi } = await import('../mock-pb.js');
    api = new PbApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host
    );
  } else {
    const { InvestecPbApi } = await import('investec-pb-api');
    api = new InvestecPbApi(
      credentials.clientId,
      credentials.clientSecret,
      credentials.apiKey,
      credentials.host
    );
  }
  try {
    await api.getAccessToken();
  } catch (error) {
    throw normalizeInvestecError(error, 'pb-api-auth');
  }

  return api;
}

/**
 * Normalizes cardKey to a number, handling both string and number inputs.
 * @param cardKey - Card key as string or number
 * @param credentialsCardKey - Fallback card key from credentials
 * @returns Normalized card key as number
 */
export function normalizeCardKey(
  cardKey: string | number | undefined,
  credentialsCardKey: string
): number {
  if (cardKey !== undefined) {
    const num = typeof cardKey === 'string' ? Number(cardKey) : cardKey;
    if (Number.isNaN(num)) {
      throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'Invalid card key: must be a number');
    }
    return num;
  }
  if (credentialsCardKey === '') {
    throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
  }
  const num = Number(credentialsCardKey);
  if (Number.isNaN(num)) {
    throw new CliError(
      ERROR_CODES.MISSING_CARD_KEY,
      'Invalid card key in credentials: must be a number'
    );
  }
  return num;
}

/**
 * Initializes the Card API client.
 * @param credentials - API credentials
 * @param options - Basic options including credential overrides
 * @returns Initialized ICardApi instance
 */
export async function initializeApi(
  credentials: Credentials,
  options: BasicOptions
): Promise<ICardApi> {
  const resolvedCredentials = await optionCredentials(options, credentials);
  validateCredentialsFile(resolvedCredentials);

  let api: ICardApi;
  if (isMockApisEnabled()) {
    const { CardApi } = await import('../mock-card.js');
    api = new CardApi(
      resolvedCredentials.clientId,
      resolvedCredentials.clientSecret,
      resolvedCredentials.apiKey,
      resolvedCredentials.host
    );
  } else {
    const { InvestecCardApi } = await import('investec-card-api');
    api = new InvestecCardApi(
      resolvedCredentials.clientId,
      resolvedCredentials.clientSecret,
      resolvedCredentials.apiKey,
      resolvedCredentials.host
    );
  }

  try {
    await api.getAccessToken();
  } catch (error) {
    throw normalizeInvestecError(error, 'card-api-auth');
  }

  return api;
}
