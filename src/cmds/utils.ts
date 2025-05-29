import chalk from "chalk";

export function handleCliError(
  error: any,
  options: { verbose?: boolean },
  context: string,
) {
  console.error(chalk.redBright(`Failed to ${context}:`), error.message);
  console.log("");
  if (options.verbose) {
    console.error(error);
  }
}
