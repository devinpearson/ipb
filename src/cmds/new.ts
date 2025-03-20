import chalk from "chalk";
import fs from "fs";
import path from "path";

interface Options {
  template: string;
}

export async function newCommand(name: string, options: Options) {
    const uri = path.join(import.meta.dirname, '/../templates/', options.template);
    console.log(uri);
  try {
    if (!fs.existsSync(uri)) {
        throw new Error("Template doesnt exist");
    }
    // console.log(import.meta.dirname);
    fs.cpSync(uri, name, { recursive: true })
  } catch (error) {
    console.error(chalk.redBright("Failed to create from template:"), error);
  }
}
