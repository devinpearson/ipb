import chalk from "chalk";
import fs from "fs";
import path from "path";
import { printTitleBox } from "../index.js";

interface Options {
  template: string;
}

export async function newCommand(name: string, options: Options) {
    printTitleBox();
    const uri = path.join(import.meta.dirname, '/../templates/', options.template);
    console.log('📂 Finding template at ' + chalk.green(uri));
    //console.log(uri);
  try {
    if (!fs.existsSync(uri)) {
        throw new Error("💣 Template does not exist");
    }
    // console.log(import.meta.dirname);
    fs.cpSync(uri, name, { recursive: true })
    console.log(`🚀 Created new project from template ${options.template}`);
    console.log("");
  } catch (error) {
    console.error(chalk.redBright("Failed to create from template:"), error);
  }
}
