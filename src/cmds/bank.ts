import fs from "fs";
import chalk from "chalk";
import OpenAI from "openai";
import { printTitleBox, credentials } from "../index.js";
import https from "https";
import { getAccounts, getAccountsFunctionCall, getWeather, getWeatherFunctionCall } from "../function-calls.js";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const instructions = `- You are a banking bot, enabling the user to access their investec accounts based on user input.`;

interface Options {
  //   host: string; // will change this to openai compatible host
  credentialsFile: string; // will allow the openai api key to be set in the file as well as its host
  filename: string;
  verbose: boolean;
}

export async function bankCommand(prompt: string, options: Options) {
  try {
    printTitleBox();
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

    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to fetch cards:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}

async function generateResponse(
  prompt: string,
  instructions: string,
): Promise<string | null> {
  try {
    let openai = new OpenAI({
      apiKey: credentials.openaiKey,
    });

    if (credentials.openaiKey === "" || credentials.openaiKey === undefined) {
      openai = new OpenAI({
        httpAgent: agent,
        apiKey: credentials.sandboxKey,
        baseURL: "https://ipb.sandboxpay.co.za/proxy/v1",
      });
    }

    // Use OpenAI chat completions API correctly
    const tools: OpenAI.ChatCompletionTool[] = [
      getAccountsFunctionCall,
    ];

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: instructions },
      { role: "user", content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages,
      tools,
    });
    // Defensive: check completion.choices[0] and .message
    const message = completion.choices && completion.choices[0] && completion.choices[0].message ? completion.choices[0].message : undefined;
    if (!message) throw new Error("No message returned from OpenAI");

    if (message.tool_calls) {
      const availableFunctions: Record<string, (...args: any[]) => any> = {
        get_accounts: getAccounts,
      };
      const toolCalls = message.tool_calls;

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        if (!functionToCall) continue; // skip unknown tools
        const functionArgs = JSON.parse(toolCall.function.arguments);
        // getWeather expects latitude and longitude
        const functionResponse = await functionToCall();
        const response2 = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: null,
              tool_calls: [toolCall],
            },
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof functionResponse === 'string' ? functionResponse : JSON.stringify(functionResponse),
            } as OpenAI.ChatCompletionToolMessageParam,
          ],
          tools,
        });
        
        if (
          response2.choices &&
          response2.choices[0] &&
          response2.choices[0].message &&
          response2.choices[0].message.content
        ) {
          const content = response2.choices[0].message.content;
          return content;
        }
      }
    } else if (
      message.content
    ) {
      const content = message.content;
      return content;
    }
    throw new Error("Invalid response format from OpenAI");
  } catch (error) {
    console.error("Error generating code:", error);
    return null;
  }
}
