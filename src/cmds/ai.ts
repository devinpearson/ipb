import { promises as fsPromises } from 'node:fs';
import https from 'node:https';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { CliError, ERROR_CODES } from '../errors.js';
import { credentials, printTitleBox } from '../index.js';
import {
  createSpinner,
  formatFileSize,
  getFileSize,
  getSafeText,
  isStdoutPiped,
  resolveSpinnerState,
  validateFilePathForWrite,
  withSpinner,
} from '../utils.js';

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
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
  code: z.string().describe('The code to be generated'),
  env_variables: z.array(z.string()).nullable().describe('Environment variables'),
  description: z.string().describe('Description of the code and how to use it'),
  example_transaction: z
    .object({
      accountNumber: z.string().describe('Account number'),
      dateTime: z.string().describe('Date and time of the transaction'),
      centsAmount: z.number().describe('Amount in cents'),
      currencyCode: z.string().describe('Currency code'),
      reference: z.string().describe('Reference string'),
      merchant: z
        .object({
          name: z.string().describe('Merchant name'),
          city: z.string().describe('Merchant city'),
          country: z.string().describe('Merchant country'),
          category: z
            .object({
              key: z.string().describe('Category key'),
              code: z.string().describe('Category code'),
              name: z.string().describe('Category name'),
            })
            .describe('Category object'),
        })
        .describe('Merchant object'),
    })
    .describe('Example transaction'),
});

type Output = z.infer<typeof outputSchema>;

interface Options {
  credentialsFile: string;
  filename: string;
  verbose: boolean;
  spinner?: boolean;
}
/**
 * Generates card code using an LLM based on a prompt.
 * @param prompt - The prompt describing what the code should do
 * @param options - CLI options including filename and verbose flag
 * @throws {Error} When code generation fails or file operations fail
 */
export async function aiCommand(prompt: string, options: Options) {
  const envFilename = '.env.ai';
  const isPiped = isStdoutPiped();
  if (!isPiped) {
    printTitleBox();
  }

  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });

  // Prompt for prompt if not provided
  if (!prompt) {
    prompt = await input({ message: 'Enter your AI code prompt:' });
  }

  console.log(chalk.blueBright('Calling OpenAI with the prompt and instructions'));
  console.log(chalk.blueBright('Prompt:'));
  console.log(prompt);

  const genSpinner = createSpinner(
    spinnerEnabled,
    getSafeText('🤖 generating code with OpenAI...')
  );
  const response = await withSpinner(genSpinner, spinnerEnabled, async () =>
    generateCode(prompt, instructions)
  );
  if (options.verbose) {
    console.log('');
    console.log(chalk.blueBright('Response from OpenAI:'));
    console.log(response);
  } else {
    console.log('');
    console.log(chalk.blueBright('Response from OpenAI:'));
    console.log(chalk.blueBright('Description:'));
    console.log(response?.description);
  }
  console.log('');

  // Validate OpenAI response before using it
  if (!response || typeof response.code !== 'string' || response.code.trim() === '') {
    console.error(chalk.red('Error: Invalid or missing code in OpenAI response'));
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      'OpenAI response is missing or invalid. The response must contain a non-empty code string.'
    );
  }

  const output = response.code;
  const normalizedFilename = await validateFilePathForWrite(options.filename, ['.js']);

  const outputSize = Buffer.byteLength(output, 'utf8');
  const spinner = createSpinner(
    spinnerEnabled,
    getSafeText(`💾 saving to file: ${normalizedFilename} (${formatFileSize(outputSize)})...`)
  );
  await withSpinner(spinner, spinnerEnabled, async () => {
    await fsPromises.writeFile(normalizedFilename, output, 'utf8');
  });

  const finalSize = await getFileSize(normalizedFilename);
  console.log(getSafeText(`🎉 generated code saved to file (${formatFileSize(finalSize)})`));

  if (response?.env_variables) {
    console.log('');
    const normalizedEnvFilename = await validateFilePathForWrite(envFilename);
    const envContent = response.env_variables
      .map((envVar) => `${envVar}=${process.env[envVar] ?? ''}\n`)
      .join('');
    const envSize = Buffer.byteLength(envContent, 'utf8');
    const envSpinner = createSpinner(
      spinnerEnabled,
      getSafeText(
        `💾 saving env variables to file: ${normalizedEnvFilename} (${formatFileSize(envSize)})...`
      )
    );
    await withSpinner(envSpinner, spinnerEnabled, async () => {
      await fsPromises.writeFile(normalizedEnvFilename, envContent, 'utf8');
    });

    const finalEnvSize = await getFileSize(normalizedEnvFilename);
    console.log(getSafeText(`🎉 env variables saved to file (${formatFileSize(finalEnvSize)})`));
  }
  if (response?.example_transaction) {
    console.log('');
    console.log(chalk.blueBright('To test locally run:'));
    console.log(
      `ipb run -f ai-generated.js --env ai --currency ${response.example_transaction.currencyCode} --amount ${response.example_transaction.centsAmount} --mcc ${response.example_transaction.merchant.category.code} --merchant '${response.example_transaction.merchant.name}' --city '${response.example_transaction.merchant.city}' --country '${response.example_transaction.merchant.country}'`
    );
  }
}

async function generateCode(prompt: string, instructions: string): Promise<Output | null> {
  try {
    let openai = new OpenAI({
      apiKey: credentials.openaiKey,
    });
    if (credentials.openaiKey === '' || credentials.openaiKey === undefined) {
      openai = new OpenAI({
        httpAgent: agent,
        apiKey: credentials.sandboxKey,
        baseURL: 'https://ipb.sandboxpay.co.za/proxy/v1',
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.2,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
      response_format: zodResponseFormat(outputSchema, 'output_schema'),
    });
    if (response.choices?.[0]?.message?.content) {
      const content = response.choices[0].message.content;
      return outputSchema.parse(JSON.parse(content));
    }
    throw new Error('Invalid response format from OpenAI');
  } catch (error) {
    console.error('Error generating code:', error);
    return null;
  }
}
