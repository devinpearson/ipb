import type {
  AccountBalance,
  AccountResponse,
  AccountTransaction,
  BeneficiaryResponse,
  Transfer,
  TransferMultiple,
} from 'investec-pb-api';
import type OpenAI from 'openai';
import type { BasicOptions } from './cmds/types.js';
import { credentials } from './index.js';
import { initializePbApi } from './utils.js';

export const getWeatherFunctionCall: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get current temperature for provided coordinates in celsius.',
    parameters: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
      required: ['latitude', 'longitude'],
      additionalProperties: false,
    },
  },
};

export async function getWeather(_latitude: number, _longitude: number) {
  // Mock implementation - real API call commented out
  return '24C';
  // const response = await fetch(
  //   `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
  // );
  // const data = await response.json();
  // return (data as { current: { temperature_2m: string } }).current.temperature_2m;
}

interface Options extends BasicOptions {
  verbose: boolean;
}

export const getAccountsFunctionCall: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_accounts',
    description: 'Get a list of your accounts.',
  },
};

export const getBalanceFunctionCall: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_balance',
    description: 'Get the balance for a specific account.',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
      },
      required: ['accountId'],
      additionalProperties: false,
    },
  },
};

export const getAccountTransactionFunctionCall: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_transactions',
    description: 'Get the transactions for a specific account.',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        fromDate: { type: 'string', format: 'date' },
        toDate: { type: 'string', format: 'date' },
      },
      required: ['accountId', 'fromDate'],
      additionalProperties: false,
    },
  },
};

export const getBeneficiariesFunctionCall: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_beneficiaries',
    description: 'Get a list of your external beneficiaries for making payments.',
  },
};

export const transferMultipleFunctionCall: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'transfer_multiple',
    description:
      'Transfer money between accounts. the beneficiaryAccountId is the account you are transferring to.',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        beneficiaryAccountId: { type: 'string' },
        amount: { type: 'string' },
        myReference: { type: 'string' },
        theirReference: { type: 'string' },
      },
      required: ['accountId', 'beneficiaryAccountId', 'amount', 'myReference', 'theirReference'],
      additionalProperties: false,
    },
  },
};

export async function getAccounts(_args?: unknown): Promise<AccountResponse['data']['accounts']> {
  const api = await initializePbApi(credentials, {} as Options);
  const result = await api.getAccounts();
  console.log('💳 fetching accounts');
  const accounts = result.data.accounts;
  return accounts;
}

export async function getAccountBalances(args: unknown): Promise<AccountBalance> {
  const options = args as { accountId: string };
  if (!options || typeof options !== 'object' || !('accountId' in options)) {
    throw new Error('getAccountBalances requires { accountId: string }');
  }
  const api = await initializePbApi(credentials, {} as Options);
  console.log(`💳 fetching balances for account ${options.accountId}`);
  const result = await api.getAccountBalances(options.accountId);
  const accounts = result.data;
  return accounts;
}

// thin out responses as they use too many tokens
export async function getAccountTransactions(args: unknown): Promise<AccountTransaction[]> {
  const options = args as {
    accountId: string;
    fromDate: string;
    toDate: string;
  };
  if (
    !options ||
    typeof options !== 'object' ||
    !('accountId' in options) ||
    !('fromDate' in options) ||
    !('toDate' in options)
  ) {
    throw new Error(
      'getAccountTransactions requires { accountId: string; fromDate: string; toDate: string }'
    );
  }
  const api = await initializePbApi(credentials, {} as Options);
  console.log(
    `💳 fetching transactions for account ${options.accountId}, fromDate: ${options.fromDate}, toDate: ${options.toDate}`
  );
  const result = await api.getAccountTransactions(options.accountId, '2025-05-24', options.toDate);
  const transactions = result.data.transactions;
  return transactions;
}

export async function getBeneficiaries(_args?: unknown): Promise<BeneficiaryResponse['data']> {
  const api = await initializePbApi(credentials, {} as Options);
  const result = await api.getBeneficiaries();
  console.log('💳 fetching beneficiaries');
  const beneficiaries = result.data;
  return beneficiaries;
}

export async function transferMultiple(args: unknown): Promise<Transfer[]> {
  const options = args as {
    accountId: string;
    beneficiaryAccountId: string;
    amount: string;
    myReference: string;
    theirReference: string;
  };
  if (
    !options ||
    typeof options !== 'object' ||
    !('accountId' in options) ||
    !('beneficiaryAccountId' in options) ||
    !('amount' in options) ||
    !('myReference' in options) ||
    !('theirReference' in options)
  ) {
    throw new Error(
      'transferMultiple requires { accountId: string; beneficiaryAccountId: string; amount: string; myReference: string; theirReference: string }'
    );
  }
  const api = await initializePbApi(credentials, {} as Options);
  console.log(`💳 transfering for account ${options.accountId}`);
  const transfer: TransferMultiple = {
    beneficiaryAccountId: options.beneficiaryAccountId,
    amount: '10', // hardcoded for testing
    myReference: options.myReference,
    theirReference: options.theirReference,
  };
  // Fix: always pass as array to match type signature
  const result = await api.transferMultiple(options.accountId, [transfer]);
  const transferResponse = result.data.TransferResponses;
  return transferResponse;
}

export const tools: OpenAI.ChatCompletionTool[] = [
  getAccountsFunctionCall,
  getBalanceFunctionCall,
  getAccountTransactionFunctionCall,
  getBeneficiariesFunctionCall,
  transferMultipleFunctionCall,
];

export const availableFunctions: Record<string, (args?: unknown) => Promise<unknown>> = {
  get_accounts: getAccounts,
  get_balance: getAccountBalances,
  get_transactions: getAccountTransactions,
  get_beneficiaries: getBeneficiaries,
  transfer_multiple: transferMultiple,
};
