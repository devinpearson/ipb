import OpenAI from "openai";
import { init } from "openai/_shims/index.mjs";
import { credentials, initializePbApi } from "./index.js";

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
      }

export async function getWeather(latitude: number, longitude: number) {
  return '24C';
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`);
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
      }
// If you want to avoid the error, use 'any[]' as the return type
export async function getAccounts(): Promise<any[]> {
  const api = await initializePbApi(credentials, {} as Options);
  const result = await api.getAccounts();
  const accounts = result.data.accounts;
  return accounts;
}