import type { BasicOptions, Credentials, MauBasicOptions } from '../cmds/types.js';
import { CliError, ERROR_CODES } from '../errors.js';
import type { ICardApi } from '../mock-card.js';
import type { IMauApi } from '../mock-mau.js';
import type { IPbApi } from '../mock-pb.js';
import { optionCredentials, optionMauCredentials } from '../runtime-credentials.js';
import { validateCredentialsFile, validateMauCredentials } from './credentials-validation.js';
import { normalizeInvestecError } from './investec-errors.js';
import { CARD_WRITE_METHODS, guardWrites, PB_WRITE_METHODS } from './read-only.js';
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

  return guardWrites(api, PB_WRITE_METHODS, credentials);
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
    return parseCardKey(cardKey, 'Invalid card key');
  }
  if (credentialsCardKey.trim() === '') {
    throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'card-key is required');
  }
  return parseCardKey(credentialsCardKey, 'Invalid card key in credentials');
}

/**
 * Card keys are positive whole numbers. Number() alone would turn "0x10" into card 16,
 * "1e3" into 1000 and accept "1.5" or "-4".
 */
function parseCardKey(value: string | number, label: string): number {
  const text = String(value).trim();
  const num = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(num) || num === 0) {
    throw new CliError(
      ERROR_CODES.MISSING_CARD_KEY,
      `${label}: must be a positive whole number (digits only), got "${text}". Run \`ipb cards\` to list your card keys.`
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

  return guardWrites(api, CARD_WRITE_METHODS, resolvedCredentials);
}

/**
 * Initializes the Mauritius (MAU) Open Banking API client.
 * @param credentials - API credentials (uses mau* fields)
 * @param options - MAU credential override options
 * @returns Initialized IMauApi instance
 */
export async function initializeMauApi(
  credentials: Credentials,
  options: MauBasicOptions
): Promise<IMauApi> {
  const resolvedCredentials = await optionMauCredentials(options, credentials);
  validateMauCredentials(resolvedCredentials);

  let api: IMauApi;
  if (isMockApisEnabled()) {
    const { MauApi } = await import('../mock-mau.js');
    api = new MauApi(
      resolvedCredentials.mauClientId,
      resolvedCredentials.mauClientSecret,
      resolvedCredentials.mauApiKey,
      resolvedCredentials.mauHost
    );
  } else {
    const { InvestecMauApi } = await import('investec-mau-api');
    api = new InvestecMauApi(
      resolvedCredentials.mauClientId,
      resolvedCredentials.mauClientSecret,
      resolvedCredentials.mauApiKey,
      resolvedCredentials.mauHost
    );
  }

  try {
    await api.getAccessToken();
  } catch (error) {
    throw normalizeInvestecError(error, 'mau-api-auth');
  }

  return api;
}
