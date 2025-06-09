import fs from "fs";
import chalk from "chalk";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { printTitleBox, credentials } from "../index.js";
import https from "https";
import { handleCliError } from "../utils.js";
import { input } from "@inquirer/prompts";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const instructions = `- You are a coding assistant that creates code snippets for users.
- The purpose is to create a code snippet that helps the user control their credit card transactions and taking action if the transaction declines or if it is approved. 
- The code must have three async functions that will be called by an external system. first beforeTransaction(transaction) second afterTransaction(transaction) third afterDecline(transaction). 
- The beforeTransaction(transaction) function must return a boolean value. If the value is true, the transaction will be processed. If the value is false, the transaction will be declined.
- You can add local functions to make the code more reusable and modular.
- Example Response 
async function beforeTransaction(transaction) {

}

async function afterTransaction(transaction) {

}

async function afterDecline(transaction) {

}

- The transaction object comprises of the following properties: accountNumber, dateTime, centsAmount, currencyCode, reference and a merchant object with the following properties: name, city, country and category object which consists of key, code and name. all fields are required
- Console log the transaction object in the beforeTransaction, afterTransaction function and the afterDecline if logging isnt mentioned by user input.
- Where possible do not use any external libraries and only use native JavaScript that does not need to be imported.
- anything that is not code in the result shall be commented out
- code will be run in a node vm environment with node-fetch and momentjs imported
- When fetch is used console log the response object
- URLSearchParams and Buffer is not available in the environment
- build request bodies as plaintext without URLSearchParams or Buffer under any circumstances
- if a fetch request is being made and there is Authorization, use the following format: 'Basic ' + auth_token, no encoding as the auth token provided is already in base64
- When comparing strings, use lowerCase() to ensure case insensitivity.
- The code must be written in JavaScript.
- Output must be Javascript format only`;
// Define the desired output schema using Zod
const outputSchema = z.object({
  code: z.string().describe("The code to be generated"),
  env_variables: z
    .array(z.string())
    .nullable()
    .describe("Environment variables"),
  description: z.string().describe("Description of the code and how to use it"),
  example_transaction: z
    .object({
      accountNumber: z.string().describe("Account number"),
      dateTime: z.string().describe("Date and time of the transaction"),
      centsAmount: z.number().describe("Amount in cents"),
      currencyCode: z.string().describe("Currency code"),
      reference: z.string().describe("Reference string"),
      merchant: z
        .object({
          name: z.string().describe("Merchant name"),
          city: z.string().describe("Merchant city"),
          country: z.string().describe("Merchant country"),
          category: z
            .object({
              key: z.string().describe("Category key"),
              code: z.string().describe("Category code"),
              name: z.string().describe("Category name"),
            })
            .describe("Category object"),
        })
        .describe("Merchant object"),
    })
    .describe("Example transaction"),
  // instructions: z.array(z.string()).describe("Step-by-step instructions"),
  // prepTime: z.string().optional().describe("Preparation time (optional)"),
});

type Output = z.infer<typeof outputSchema>;

interface Options {
  //   host: string; // will change this to openai compatible host
  credentialsFile: string; // will allow the openai api key to be set in the file as well as its host
  filename: string;
  verbose: boolean;
}
// node . 'send a notification after transaction via twilio sms'
// node . 'limit transactions to only Woolworths, Checkers and Spar'
// node . 'allow transactions that USD or ZAR'
export async function aiCommand(prompt: string, options: Options) {
  try {
    const envFilename = ".env.ai";
    printTitleBox();
    // Prompt for prompt if not provided
    if (!prompt) {
      prompt = await input({ message: "Enter your AI code prompt:" });
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

    const response = await generateCode(prompt, instructions);
    // mention calling open ai with the prompt and instructions
    if (options.verbose) {
      console.log("");
      console.log(chalk.blueBright("Response from OpenAI:"));
      console.log(response);
    } else {
      console.log("");
      console.log(chalk.blueBright("Response from OpenAI:"));
      console.log(chalk.blueBright("Description:"));
      console.log(response?.description);
    }
    console.log("");
    var output = response?.code as string;
    // remove ```javascript // seems to only be needed if its not structured output
    // output = output.replace(/```javascript/g, "");
    // remove ```
    // output = output.replace(/```/g, "");
    console.log(`💾 saving to file: ${chalk.greenBright(options.filename)}`);
    await fs.writeFileSync(options.filename, output);
    console.log("🎉 generated code saved to file");
    // write the env variables to a file
    if (response?.env_variables) {
      console.log("");
      console.log(
        `💾 saving env variables to file: ${chalk.greenBright(envFilename)}`,
      );
      const envFile = fs.createWriteStream(envFilename);
      response.env_variables.forEach((envVar) => {
        envFile.write(`${envVar}=${process.env[envVar]}\n`);
      });
      envFile.end();
      console.log("🎉 env variables saved to file");
    }
    // show example call to ipb rub with example transaction
    if (response?.example_transaction) {
      console.log("");
      console.log(chalk.blueBright("To test locally run:"));
      console.log(
        `ipb run -f ai-generated.js --env ai --currency ${response.example_transaction.currencyCode} --amount ${response.example_transaction.centsAmount} --mcc ${response.example_transaction.merchant.category.code} --merchant '${response.example_transaction.merchant.name}' --city '${response.example_transaction.merchant.city}' --country '${response.example_transaction.merchant.country}'`,
      );
    }
  } catch (error: any) {
    handleCliError(error, options, "AI generation");
  }
}

async function generateCode(
  prompt: string,
  instructions: string,
): Promise<Output | null> {
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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(outputSchema, "output_schema"),
    });
    if (
      response.choices &&
      response.choices[0] &&
      response.choices[0].message &&
      response.choices[0].message.content
    ) {
      const content = response.choices[0].message.content;
      return outputSchema.parse(JSON.parse(content));
    }
    throw new Error("Invalid response format from OpenAI");
  } catch (error) {
    console.error("Error generating code:", error);
    return null;
  }
}
