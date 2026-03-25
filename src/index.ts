#!/usr/bin/env node
// File: src/index.ts
// Main entry point for the Investec Programmable Banking CLI
// Sets up all CLI commands and shared options using Commander.js
// For more information, see README.md

import 'dotenv/config';
import process from 'node:process';
import chalk from 'chalk';
import { Command } from 'commander';
import { registerCliCommands } from './register-cli-commands.js';
import {
  credentialLocation,
  credentials,
  optionCredentials,
  printTitleBox,
} from './runtime-credentials.js';
import { normalizeSpinnerFlags } from './utils/spinner-flags.js';
import {
  checkForUpdates,
  configureChalk,
  getVerboseMode,
  handleCliError,
  isUpdateCheckDisabled,
  logCommandHistory,
  shouldDisplayUpdateNotification,
  showUpdateNotification,
  warnAboutSecretUsage,
} from './utils.js';

export { credentialLocation, credentials, optionCredentials, printTitleBox };

// Configure chalk to respect NO_COLOR and FORCE_COLOR at startup
configureChalk();

const version = '0.8.3';
const program = new Command();

// Improve error output for missing arguments/options
program.showHelpAfterError();
program.showSuggestionAfterError();

const spinnerFlagNormalization = normalizeSpinnerFlags(process.argv);
process.argv = spinnerFlagNormalization.argv;

// Show help if no arguments are provided (unless --check-updates is specified)
if (process.argv.length <= 2 && !process.argv.includes('--check-updates')) {
  program.outputHelp();
  process.exit(0);
}

async function main() {
  program.name('ipb').description('CLI to manage Investec Programmable Banking').version(version);

  if (spinnerFlagNormalization.usedDeprecatedSpinnerFlag) {
    console.warn(
      chalk.yellow('Warning: `--spinner` / `-s` is deprecated. Use `--no-spinner` instead.')
    );
  }

  // Add global options
  program.option('--check-updates', 'Check for available updates');
  program.option('--no-history', 'Disable command history logging');

  // Add help text with command categories
  program.addHelpText(
    'afterAll',
    `
Command Categories:
  Card Management        cards, enable, disable
  Code Management        deploy, fetch, upload, publish, published, logs, run, simulate
  Environment Management env, env-list, upload-env
  Account Management     accounts, balances, transactions, beneficiaries
  Payments              transfer, pay
  Configuration         config
  AI & Code Generation  new
  Reference Data        currencies, countries, merchants
  Utilities             completion

For more information about a specific command, use:
  $ ipb <command> --help
`
  );

  registerCliCommands(program, { credentialLocation });

  // Check for --check-updates flag in raw arguments
  const hasCheckUpdatesFlag = process.argv.includes('--check-updates');

  // If --check-updates flag is present, handle it before parsing
  if (hasCheckUpdatesFlag && process.argv.length === 3) {
    // Only --check-updates flag, no command
    if (!isUpdateCheckDisabled()) {
      const latestVersion = await checkForUpdates(version, true);
      if (latestVersion) {
        showUpdateNotification(version, latestVersion);
      } else {
        console.log(chalk.green('✓ You are using the latest version.'));
      }
    } else {
      console.log(chalk.dim('Skipping version check (IPB_NO_UPDATE_CHECK is set).'));
    }
    process.exit(0);
  }

  // Check if stdout is piped before parsing
  const { isStdoutPiped } = await import('./utils.js');
  const isPiped = isStdoutPiped();

  // Determine initial verbose mode from raw args (before parsing)
  const hasVerboseFlag = process.argv.includes('--verbose') || process.argv.includes('-v');
  let verboseMode = getVerboseMode(hasVerboseFlag);

  // Track command execution for history logging
  const startTime = Date.now();
  let commandName = '';
  let commandOptions: Record<string, unknown> = {};
  let exitCode = 0;

  // Hook into command execution to capture command details
  program.hook('preAction', (thisCommand) => {
    commandName = thisCommand.name() || thisCommand.parent?.name() || '';
    // Merge global options and command-specific options
    const globalOpts = program.opts();
    const commandOpts = thisCommand.opts();
    commandOptions = { ...globalOpts, ...commandOpts };
    verboseMode = getVerboseMode(
      typeof commandOptions.verbose === 'boolean' ? commandOptions.verbose : undefined
    );
  });

  try {
    // Warn about secret usage (will only show if verbose or in non-interactive environment)
    warnAboutSecretUsage({ verbose: verboseMode });

    // Parse arguments to execute commands
    await program.parseAsync(process.argv);

    // If we got here, command succeeded
    exitCode = 0;
  } catch (error) {
    // Command failed - exit code will be set by handleCliError
    exitCode = 1;
    throw error;
  } finally {
    // Log command history unless --no-history is set (for both success and failure)
    try {
      const globalOpts = program.opts();
      const noHistory = globalOpts.history === false;

      if (!noHistory && commandName) {
        const duration = Date.now() - startTime;
        // Get the actual command name from program.args or the command that was executed
        const actualCommandName = program.args[0] || commandName;
        const actualArgs = program.args.slice(1);

        // Merge all options (global + command-specific)
        const allOptions = { ...globalOpts, ...commandOptions };

        // Non-blocking: don't await to avoid slowing down command exit
        logCommandHistory(actualCommandName, actualArgs, allOptions, exitCode, duration).catch(
          () => {
            // Ignore errors
          }
        );
      }
    } catch {
      // Ignore errors logging history
    }
  }

  // Check for updates after command execution (with rate limiting, unless --check-updates flag is used)
  const updateNotificationAllowed = shouldDisplayUpdateNotification({
    isPiped,
    json: typeof commandOptions.json === 'boolean' ? commandOptions.json : undefined,
    yaml: typeof commandOptions.yaml === 'boolean' ? commandOptions.yaml : undefined,
    output: typeof commandOptions.output === 'string' ? commandOptions.output : undefined,
  });

  if (!isUpdateCheckDisabled()) {
    if (hasCheckUpdatesFlag && process.argv.length > 3) {
      // --check-updates flag with a command - check after command execution
      const latestVersion = await checkForUpdates(version, true);
      if (latestVersion && updateNotificationAllowed) {
        showUpdateNotification(version, latestVersion);
      } else if (!latestVersion) {
        console.log(chalk.green('✓ You are using the latest version.'));
      }
    } else if (process.argv.length === 2) {
      // No arguments provided (shouldn't happen due to early exit, but just in case)
      const latestVersion = await checkForUpdates(version, false);
      if (latestVersion && updateNotificationAllowed) {
        showUpdateNotification(version, latestVersion);
      }
    } else if (!hasCheckUpdatesFlag) {
      // Background check for regular commands (non-blocking, cached for 24 hours)
      if (updateNotificationAllowed) {
        checkForUpdates(version, false)
          .then((latest) => {
            if (latest) {
              showUpdateNotification(version, latest);
            }
          })
          .catch(() => {
            // Silent failure for background checks
          });
      }
    }
  }

  // Only add newline if not piped (to avoid corrupting JSON output)
  if (!isPiped) {
    console.log(''); // Add a newline after command execution
  }
}

main().catch((err) => {
  const commandContext = (err as Error & { commandContext?: string })?.commandContext;
  const context = commandContext ? `${commandContext} command` : 'run CLI';
  // Determine verbose mode from CLI flags (default false if not available)
  const globalOpts = program.opts();
  const verboseOption =
    typeof globalOpts.verbose === 'boolean'
      ? globalOpts.verbose
      : process.argv.includes('--verbose') || process.argv.includes('-v');
  const verboseMode = getVerboseMode(verboseOption);
  handleCliError(err, { verbose: verboseMode }, context);
});
