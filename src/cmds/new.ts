import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { CliError, ERROR_CODES } from '../errors.js';
import { printTitleBox } from '../index.js';

interface Options {
  template: string;
  verbose: boolean;
  force: boolean;
}

/**
 * Creates a new project from a template.
 * @param name - Name of the new project
 * @param options - CLI options including template name and force flag
 * @throws {CliError} When template is not found, project name is invalid, or project already exists
 */
export async function newCommand(name: string, options: Options) {
  printTitleBox();
  const uri = path.join(import.meta.dirname, '/../templates/', options.template);
  console.log(`📂 Finding template called ${chalk.green(options.template)}`);
  if (!fs.existsSync(uri)) {
    throw new CliError(ERROR_CODES.TEMPLATE_NOT_FOUND, '💣 Template does not exist');
  }
  // Validate project name
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    throw new CliError(
      ERROR_CODES.INVALID_PROJECT_NAME,
      '💣 Project name contains invalid characters. Use only letters, numbers, hyphens, and underscores.'
    );
  }
  // Add a force option to the Options interface
  if (fs.existsSync(name) && options.force) {
    console.log(chalk.yellowBright(`Warning: Overwriting existing project ${name}`));
    // Remove existing directory
    fs.rmSync(name, { recursive: true, force: true });
  } else if (fs.existsSync(name)) {
    throw new CliError(ERROR_CODES.PROJECT_EXISTS, '💣 Project already exists');
  }
  fs.cpSync(uri, name, { recursive: true });
  console.log(`🚀 Created new project from template ${options.template}`);
  console.log('');
  // Provide next steps
  console.log('Next steps:');
  console.log(`- 📂 Navigate to your project: ${chalk.green(`cd ${name}`)}`);
  console.log(`- 📝 Edit your code in ${chalk.green(`${name}/main.js`)}`);
  console.log(`- 🧪 Test your code with: ${chalk.green(`ipb run -f ${name}/main.js`)}`);
}
