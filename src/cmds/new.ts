import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { CliError, ERROR_CODES } from '../errors.js';
import { printTitleBox } from '../runtime-credentials.js';
import {
  createSpinner,
  getSafeText,
  isStdoutPiped,
  resolveSpinnerState,
  withSpinner,
} from '../utils.js';

interface Options {
  template: string;
  verbose: boolean;
  force: boolean;
  spinner?: boolean;
}

/**
 * Creates a new project from a template.
 * @param name - Name of the new project
 * @param options - CLI options including template name and force flag
 * @throws {CliError} When template is not found, project name is invalid, or project already exists
 */
export async function newCommand(name: string, options: Options) {
  const isPiped = isStdoutPiped();
  if (!isPiped) {
    printTitleBox();
  }

  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });

  const dirnameValue = path.dirname(fileURLToPath(import.meta.url));
  const uri = path.join(dirnameValue, '/../templates/', options.template);
  console.log(getSafeText(`📂 Finding template called ${chalk.green(options.template)}`));
  if (!fs.existsSync(uri)) {
    throw new CliError(ERROR_CODES.TEMPLATE_NOT_FOUND, getSafeText('💣 Template does not exist'));
  }
  // Validate project name
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    throw new CliError(
      ERROR_CODES.INVALID_PROJECT_NAME,
      getSafeText(
        '💣 Project name contains invalid characters. Use only letters, numbers, hyphens, and underscores.'
      )
    );
  }
  if (fs.existsSync(name) && options.force) {
    console.log(chalk.yellowBright(`Warning: Overwriting existing project ${name}`));
  } else if (fs.existsSync(name)) {
    throw new CliError(ERROR_CODES.PROJECT_EXISTS, getSafeText('💣 Project already exists'));
  }

  const copySpinner = createSpinner(spinnerEnabled, getSafeText('📂 copying template...'));
  await withSpinner(copySpinner, spinnerEnabled, async () => {
    if (fs.existsSync(name) && options.force) {
      fs.rmSync(name, { recursive: true, force: true });
    }
    fs.cpSync(uri, name, { recursive: true });
  });

  console.log(getSafeText(`🚀 Created new project from template ${options.template}`));
  console.log('');
  // Provide next steps
  console.log('Next steps:');
  console.log(getSafeText(`- 📂 Navigate to your project: ${chalk.green(`cd ${name}`)}`));
  console.log(getSafeText(`- 📝 Edit your code in ${chalk.green(`${name}/main.js`)}`));
  console.log(
    getSafeText(`- 🧪 Test your code with: ${chalk.green(`ipb run -f ${name}/main.js`)}`)
  );
}
