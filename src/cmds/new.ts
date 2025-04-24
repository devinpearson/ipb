import chalk from "chalk";
import fs from "fs";
import path from "path";
import { printTitleBox } from "../index.js";

interface Options {
  template: string;
  verbose: boolean;
  force: boolean;
}

export async function newCommand(name: string, options: Options) {
  printTitleBox();
  const uri = path.join(
    import.meta.dirname,
    "/../templates/",
    options.template,
  );
  console.log("📂 Finding template called " + chalk.green(options.template));
  try {
    if (!fs.existsSync(uri)) {
      throw new Error("💣 Template does not exist");
    }
    // Validate project name
    if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
      throw new Error(
        "💣 Project name contains invalid characters. Use only letters, numbers, hyphens, and underscores.",
      );
    }
    // Add a force option to the Options interface
    if (fs.existsSync(name) && options.force) {
      console.log(
        chalk.yellowBright(`Warning: Overwriting existing project ${name}`),
      );
      // Remove existing directory
      fs.rmSync(name, { recursive: true, force: true });
    } else if (fs.existsSync(name)) {
      throw new Error("💣 Project already exists");
    }
    fs.cpSync(uri, name, { recursive: true });
    console.log(`🚀 Created new project from template ${options.template}`);
    console.log("");
    // Provide next steps
    console.log("Next steps:");
    console.log(`- 📂 Navigate to your project: ${chalk.green(`cd ${name}`)}`);
    console.log(`- 📝 Edit your code in ${chalk.green(`${name}/main.js`)}`);
    console.log(
      `- 🧪 Test your code with: ${chalk.green(`ipb run -f ${name}/main.js`)}`,
    );
  } catch (error: any) {
    console.error(
      chalk.redBright("Failed to create from template:"),
      error.message,
    );
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
