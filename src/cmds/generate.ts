import fs from "fs";
import chalk from "chalk";
import OpenAI from 'openai';

const client = new OpenAI();

interface Options {
//   host: string; // will change this to openai compatible host
  credentialsFile: string; // will allow the openai api key to be set in the file as well as its host
  verbose: boolean;
}

export async function generateCommand(prompt: string, options: Options) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    if (!fs.existsSync('./instructions.txt')) {
      throw new Error("instructions.txt does not exist");
    }
    const instructions = fs.readFileSync('./instructions.txt').toString();
    const response = await client.responses.create({
        model: 'gpt-4.1',
        instructions: instructions,
        input: prompt,
    });
    
    console.log(response.output_text);
    var output = response.output_text;
    // remove ```javascript
    output = output.replace(/```javascript/g, '');
    // remove ```
    output = output.replace(/```/g, '');
    fs.writeFileSync('./gen.js', output);
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to fetch cards:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
