import OpenAI from "openai";
import { credentials, initializePbApi } from "./index.js";
import type { AccountBalance, AccountTransaction } from "investec-pb-api";

export const getWeatherFunctionCall: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current temperature for provided coordinates in celsius.",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" },
      },
      required: ["latitude", "longitude"],
      additionalProperties: false,
    },
  },
};

export async function getWeather(latitude: number, longitude: number) {
  return "24C";
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`,
  );
  const data = await response.json();
  // Type assertion to fix 'unknown' type error
  return (data as any).current.temperature_2m;
}

interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}

export const getAccountsFunctionCall: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_accounts",
    description: "Get a list of your accounts.",
  },
};

export const getBalanceFunctionCall: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_balance",
    description: "Get the balance for a specific account.",
    parameters: {
      type: "object",
      properties: {
        accountId: { type: "string" },
      },
      required: ["accountId"],
      additionalProperties: false,
    },
  },
};

export const getAccountTransactionFunctionCall: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_transactions",
    description: "Get the transactions for a specific account.",
    parameters: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        fromDate: { type: "string", format: "date" },
        toDate: { type: "string", format: "date" },
      },
      required: ["accountId", "fromDate"],
      additionalProperties: false,
    },
  },
};
// If you want to avoid the error, use 'any[]' as the return type
export async function getAccounts(): Promise<any[]> {
  const api = await initializePbApi(credentials, {} as Options);
  const result = await api.getAccounts();
  console.log("💳 fetching accounts");
  const accounts = result.data.accounts;
  return accounts;
}

export async function getAccountBalances(options: {
  accountId: string;
}): Promise<AccountBalance> {
  const api = await initializePbApi(credentials, {} as Options);
  console.log(`💳 fetching balances for account ${options.accountId}`);
  const result = await api.getAccountBalances(options.accountId);
  const accounts = result.data;
  return accounts;
}

// thin out responses as they use too many tokens
export async function getAccountTransactions(options: {
  accountId: string;
  fromDate: string;
  toDate: string;
}): Promise<AccountTransaction[]> {
  const api = await initializePbApi(credentials, {} as Options);
  console.log(
    `💳 fetching transactions for account ${options.accountId}, fromDate: ${options.fromDate}, toDate: ${options.toDate}`,
  );
  const result = await api.getAccountTransactions(
    options.accountId,
    "2025-05-24",
    options.toDate,
  );
  const transactions = result.data.transactions;
  return transactions;
}
