import fs from "fs";
import chalk from "chalk";
import OpenAI from "openai";
import { printTitleBox, credentials } from "../index.js";
import https from "https";
import { availableFunctions, tools } from "../function-calls.js";
import { handleCliError } from "../utils.js";
import { input } from "@inquirer/prompts";

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== "false",
});

let openai: OpenAI | undefined = undefined;

const instructions = `- You are a banking bot, enabling the user to access their investec accounts based on user input. -if fetching transactions only retrieve from 5 days ago`;

interface Options {
  //   host: string; // will change this to openai compatible host
  credentialsFile: string; // will allow the openai api key to be set in the file as well as its host
  filename: string;
  verbose: boolean;
}

export async function bankCommand(prompt: string, options: Options) {
  try {
    printTitleBox();
    // Prompt for prompt if not provided
    if (!prompt) {
      prompt = await input({ message: "Enter your banking prompt:" });
    }

    openai = new OpenAI({
      apiKey: credentials.openaiKey,
    });

    if (credentials.openaiKey === "" || credentials.openaiKey === undefined) {
      openai = new OpenAI({
        httpAgent: agent,
        apiKey: credentials.sandboxKey,
        baseURL: "https://ipb.sandboxpay.co.za/proxy/v1",
      });
    }
    if (!openai) {
      throw new Error("OpenAI client is not initialized");
    }
    // if (!credentials.openaiKey) {
    //   throw new Error("OPENAI_API_KEY is not set");
    // }
    // if (!fs.existsSync("./instructions.txt")) {
    //   throw new Error("instructions.txt does not exist");
    // }

    // tell the user we are loading the instructions
    console.log(chalk.blueBright("Loading instructions from instructions.txt"));
    // read the instructions from the file

    //const instructions = fs.readFileSync("./instructions.txt").toString();
    console.log(
      chalk.blueBright("Calling OpenAI with the prompt and instructions"),
    );
    console.log(chalk.blueBright("Prompt:"));
    console.log(prompt);

    const response = await generateResponse(prompt, instructions);
    // mention calling open ai with the prompt and instructions
    if (options.verbose) {
      console.log("");
      console.log(chalk.blueBright("Response from OpenAI:"));
      console.log(response);
    } else {
      console.log("");
      console.log(chalk.blueBright("Response from OpenAI:"));
      //console.log(chalk.blueBright("Description:"));
      console.log(response);
    }
  } catch (error: any) {
    handleCliError(error, options, "bank command");
  }
}

async function generateResponse(
  prompt: string,
  instructions: string,
): Promise<string | null> {
  try {
    // Use OpenAI chat completions API correctly

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: instructions },
      { role: "user", content: prompt },
    ];

    if (!openai) {
      throw new Error("OpenAI client is not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages,
      tools,
    });
    //console.log("OpenAI response received");
    //console.log(completion.choices)
    // Defensive: check completion.choices[0] and .message
    const message =
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message
        ? completion.choices[0].message
        : undefined;
    if (!message) throw new Error("No message returned from OpenAI");

    if (message.tool_calls) {
      return await toolCall(message, tools, messages);
    } else if (message.content) {
      const content = message.content;
      return content;
    }
    throw new Error("Invalid response format from OpenAI");
  } catch (error) {
    console.error("Error generating code:", error);
    return null;
  }
}

async function secondCall(
  functionResponse: string,
  messages: OpenAI.ChatCompletionMessageParam[],
  toolCaller: OpenAI.ChatCompletionMessageToolCall,
  tools: OpenAI.ChatCompletionTool[],
) {
  if (!openai) {
    throw new Error("OpenAI client is not initialized");
  }
  // Compose the correct message sequence for tool call follow-up
  // Only include the original system/user messages, then the assistant message with tool_calls, then the tool message
  // Ensure the tool_call_id in the tool message matches the tool_call_id in the assistant message's tool_calls array
  const followupMessages: OpenAI.ChatCompletionMessageParam[] = [
    messages[0] as OpenAI.ChatCompletionMessageParam, // system
    messages[1] as OpenAI.ChatCompletionMessageParam, // user
    {
      role: "assistant",
      content: null,
      tool_calls: [
        toolCaller, // tool call from the assistant message
      ],
    } as OpenAI.ChatCompletionMessageParam,
    {
      role: "tool",
      tool_call_id: toolCaller.id,
      content:
        typeof functionResponse === "string"
          ? functionResponse
          : JSON.stringify(functionResponse),
    } as OpenAI.ChatCompletionToolMessageParam,
  ];

  const response2 = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: followupMessages,
    tools,
  });
  const message =
    response2.choices && response2.choices[0] && response2.choices[0].message
      ? response2.choices[0].message
      : undefined;
  if (!message) throw new Error("No message returned from OpenAI");
  if (message.tool_calls) {
    return await toolCall(message, tools, messages);
  }
  if (message.content) {
    const content = message.content;
    return content;
  }
  return null;
}

// Fix: toolCall should be async and return Promise<string | null>
async function toolCall(
  message: OpenAI.ChatCompletionMessage,
  tools: OpenAI.ChatCompletionTool[],
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string | null> {
  // Defensive: check if message has tool_calls property (should be on ChatCompletionMessage, not ChatCompletionToolMessageParam)
  const toolCalls = (message as any).tool_calls;
  if (!toolCalls) {
    throw new Error("No tool_calls found in message");
  }

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionToCall = availableFunctions[functionName];
    if (!functionToCall) continue; // skip unknown tools
    const functionArgs = JSON.parse(toolCall.function.arguments);
    const functionResponse = await functionToCall(functionArgs);
    return await secondCall(functionResponse, messages, toolCall, tools);
  }
  throw new Error("Invalid response format from OpenAI");
}
