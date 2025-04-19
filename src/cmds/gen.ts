import fs from "fs";
import chalk from "chalk";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { printTitleBox } from "../index.js";

const openai = new OpenAI();

// Define the desired output schema using Zod
const outputSchema = z.object({
  code: z.string().describe("The code to be generated"),
  env_variables: z
    .array(z.string())
    .optional()
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

export async function generateCommand(prompt: string, options: Options) {
  try {
    printTitleBox();
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    if (!fs.existsSync("./instructions.txt")) {
      throw new Error("instructions.txt does not exist");
    }
    // tell the user we are loading the instructions
    console.log(chalk.blueBright("Loading instructions from instructions.txt"));
    // read the instructions from the file
    const instructions = fs.readFileSync("./instructions.txt").toString();
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
        `💾 saving env variables to file: ${chalk.greenBright(".env.gen")}`,
      );
      const envFile = fs.createWriteStream(".env.gen");
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
        `ipb run -f main.js --env gen --currency ${response.example_transaction.currencyCode} --amount ${response.example_transaction.centsAmount} --mcc ${response.example_transaction.merchant.category.code} --merchant '${response.example_transaction.merchant.name}' --city '${response.example_transaction.merchant.city}' --country '${response.example_transaction.merchant.country}'`,
      );
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

async function generateCode(
  prompt: string,
  instructions: string,
): Promise<Output | null> {
  try {
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
    console.error("Error generating recipe:", error);
    return null;
  }
}
