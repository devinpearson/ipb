import https from 'node:https';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import OpenAI from 'openai';
import { CliError, ERROR_CODES } from '../errors.js';
import { availableFunctions, tools } from '../function-calls.js';
import { credentials, printTitleBox } from '../index.js';
import { createSpinner, isStdoutPiped, resolveSpinnerState, withSpinner } from '../utils.js';

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
});

let openai: OpenAI | undefined;

const instructions = `- You are a banking bot, enabling the user to access their investec accounts based on user input. -if fetching transactions only retrieve from 5 days ago`;

interface Options {
  credentialsFile: string;
  filename: string;
  verbose: boolean;
  spinner?: boolean;
}

/**
 * Uses an LLM to interact with the bank API by calling available functions.
 * @param prompt - The prompt describing what banking operation to perform
 * @param options - CLI options including verbose flag
 * @throws {Error} When LLM interaction fails or API calls fail
 */
export async function bankCommand(prompt: string, options: Options) {
  printTitleBox();
  // Prompt for prompt if not provided
  if (!prompt) {
    prompt = await input({ message: 'Enter your banking prompt:' });
  }

  openai = new OpenAI({
    apiKey: credentials.openaiKey,
  });

  if (credentials.openaiKey === '' || credentials.openaiKey === undefined) {
    openai = new OpenAI({
      httpAgent: agent,
      apiKey: credentials.sandboxKey,
      baseURL: 'https://ipb.sandboxpay.co.za/proxy/v1',
    });
  }

  console.log(chalk.blueBright('Calling OpenAI with the prompt and instructions'));
  console.log(chalk.blueBright('Prompt:'));
  console.log(prompt);

  const isPiped = isStdoutPiped();
  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, 'Calling OpenAI...');

  const response = await withSpinner(spinner, spinnerEnabled, async () =>
    generateResponse(prompt, instructions)
  );
  if (options.verbose) {
    console.log('');
    console.log(chalk.blueBright('Response from OpenAI:'));
    console.log(response);
  } else {
    console.log('');
    console.log(chalk.blueBright('Response from OpenAI:'));
    console.log(response);
  }
}

async function generateResponse(prompt: string, instructions: string): Promise<string | null> {
  try {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: instructions },
      { role: 'user', content: prompt },
    ];

    if (!openai) {
      throw new Error('OpenAI client is not initialized');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.2,
      messages,
      tools,
    });
    const message = completion.choices?.[0]?.message ? completion.choices[0].message : undefined;
    if (!message) throw new Error('No message returned from OpenAI');

    if (message.tool_calls) {
      return await toolCall(message, tools, messages);
    } else if (message.content) {
      const content = message.content;
      return content;
    }
    throw new Error('Invalid response format from OpenAI');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating code:', error);
    throw new CliError(ERROR_CODES.INVALID_INPUT, `Error generating code: ${errorMessage}`);
  }
}

async function secondCall(
  functionResponse: unknown,
  messages: OpenAI.ChatCompletionMessageParam[],
  toolCaller: OpenAI.ChatCompletionMessageToolCall,
  tools: OpenAI.ChatCompletionTool[]
) {
  if (!openai) {
    throw new Error('OpenAI client is not initialized');
  }
  const followupMessages: OpenAI.ChatCompletionMessageParam[] = [
    messages[0] as OpenAI.ChatCompletionMessageParam, // system
    messages[1] as OpenAI.ChatCompletionMessageParam, // user
    {
      role: 'assistant',
      content: null,
      tool_calls: [
        toolCaller, // tool call from the assistant message
      ],
    } as OpenAI.ChatCompletionMessageParam,
    {
      role: 'tool',
      tool_call_id: toolCaller.id,
      content:
        typeof functionResponse === 'string' ? functionResponse : JSON.stringify(functionResponse),
    } as OpenAI.ChatCompletionToolMessageParam,
  ];

  const response2 = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: followupMessages,
    tools,
  });
  const message = response2.choices?.[0]?.message ? response2.choices[0].message : undefined;
  if (!message) throw new Error('No message returned from OpenAI');
  if (message.tool_calls) {
    return await toolCall(message, tools, messages);
  }
  if (message.content) {
    const content = message.content;
    return content;
  }
  return null;
}

async function toolCall(
  message: OpenAI.ChatCompletionMessage,
  tools: OpenAI.ChatCompletionTool[],
  messages: OpenAI.ChatCompletionMessageParam[]
): Promise<string | null> {
  // Defensive: check if message has tool_calls property (should be on ChatCompletionMessage, not ChatCompletionToolMessageParam)
  const toolCalls = 'tool_calls' in message && message.tool_calls ? message.tool_calls : undefined;
  if (!toolCalls) {
    throw new Error('No tool_calls found in message');
  }

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionToCall = availableFunctions[functionName];
    if (!functionToCall) continue; // skip unknown tools
    const functionArgs = JSON.parse(toolCall.function.arguments);
    const functionResponse = await functionToCall(functionArgs);
    return await secondCall(functionResponse, messages, toolCall, tools);
  }
  throw new Error('Invalid response format from OpenAI');
}
