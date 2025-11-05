#!/usr/bin/env node
// File: src/index.ts
// Main entry point for the Investec Programmable Banking CLI
// Sets up all CLI commands and shared options using Commander.js
// For more information, see README.md

import 'dotenv/config';
import { homedir } from 'node:os';
import process from 'node:process';
import chalk from 'chalk';
import { Command, Option } from 'commander';
import { accountsCommand } from './cmds/accounts.js';
import { balancesCommand } from './cmds/balances.js';
import { beneficiariesCommand } from './cmds/beneficiaries.js';
import {
  bankCommand,
  cardsCommand,
  configCommand,
  countriesCommand,
  currenciesCommand,
  deployCommand,
  disableCommand,
  enableCommand,
  envCommand,
  envListCommand,
  fetchCommand,
  generateCommand,
  logsCommand,
  merchantsCommand,
  newCommand,
  publishCommand,
  publishedCommand,
  runCommand,
  uploadCommand,
  uploadEnvCommand,
} from './cmds/index.js';
import { loginCommand } from './cmds/login.js';
import { payCommand } from './cmds/pay.js';
import { registerCommand } from './cmds/register.js';
import { simulateCommand } from './cmds/simulate.js';
import { transactionsCommand } from './cmds/transactions.js';
import { transferCommand } from './cmds/transfer.js';
import type { BasicOptions, Credentials } from './cmds/types.js';
import { ExitCode } from './errors.js';
import {
  checkForUpdates,
  configureChalk,
  getVerboseMode,
  handleCliError,
  loadCredentialsFile,
  logCommandHistory,
  readCredentialsFileSync,
  showUpdateNotification,
  withCommandContext,
} from './utils.js';

// Configure chalk to respect NO_COLOR and FORCE_COLOR at startup
configureChalk();

const version = '0.8.3';
const program = new Command();

// Improve error output for missing arguments/options
program.showHelpAfterError();
program.showSuggestionAfterError();

// Only export what is needed outside this file
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};

/**
 * Prints CLI title (currently unused, kept for potential future use).
 */
export async function printTitleBox() {
  // Function intentionally empty - can be implemented if needed
}

// Load credentials from file if present (sync for module initialization)
const cred = readCredentialsFileSync(credentialLocation, (err) => {
  console.error(chalk.red(`🙀 Invalid credentials file format: ${err.message}`));
  console.log('');
});

export const credentials: Credentials = {
  host: process.env.INVESTEC_HOST || 'https://openapi.investec.com',
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId || '',
  clientSecret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret || '',
  apiKey: process.env.INVESTEC_API_KEY || cred.apiKey || '',
  cardKey: process.env.INVESTEC_CARD_KEY || cred.cardKey || '',
  openaiKey: process.env.OPENAI_API_KEY || cred.openaiKey || '',
  sandboxKey: process.env.SANDBOX_KEY || cred.sandboxKey || '',
};

// Helper for shared API credential options
function addApiCredentialOptions(cmd: Command) {
  return cmd
    .option('--api-key <apiKey>', 'api key for the Investec API')
    .option('--client-id <clientId>', 'client Id for the Investec API')
    .option('--client-secret <clientSecret>', 'client secret for the Investec API')
    .option('--host <host>', 'Set a custom host for the Investec Sandbox API')
    .option('--credentials-file <credentialsFile>', 'Set a custom credentials file')
    .option('--profile <profile>', 'Use a configuration profile (e.g., production, staging)')
    .option('-s,--spinner', 'disable spinner during command execution')
    .option('-v,--verbose', 'additional debugging information')
    .option('--json', 'Output raw JSON instead of formatted table')
    .option('--yaml', 'Output raw YAML instead of formatted table')
    .option('--output <file>', 'Write JSON/YAML output to file instead of stdout');
}

// Show help if no arguments are provided (unless --check-updates is specified)
if (process.argv.length <= 2 && !process.argv.includes('--check-updates')) {
  program.outputHelp();
  process.exit(0);
}

/**
 * Generates shell completion script for bash or zsh.
 * @param shell - Shell type ('bash' or 'zsh')
 * @returns Completion script as a string
 */
function generateCompletionScript(shell: string): string {
  if (shell !== 'bash' && shell !== 'zsh') {
    throw new Error(`Unsupported shell: ${shell}. Supported shells: bash, zsh`);
  }

  const commands = [
    'accounts',
    'acc', // alias for accounts
    'ai',
    'balances',
    'bal', // alias for balances
    'bank',
    'beneficiaries',
    'cards',
    'c', // alias for cards
    'completion',
    'config',
    'cfg', // alias for config
    'countries',
    'currencies',
    'deploy',
    'd', // alias for deploy
    'disable',
    'enable',
    'env',
    'env-list',
    'fetch',
    'f', // alias for fetch
    'login',
    'logs',
    'log', // alias for logs
    'merchants',
    'new',
    'pay',
    'publish',
    'pub', // alias for publish
    'published',
    'register',
    'run',
    'r', // alias for run
    'simulate',
    'transfer',
    'transactions',
    'tx', // alias for transactions
    'upload',
    'up', // alias for upload
    'upload-env',
  ];

  const globalOptions = [
    '--check-updates',
    '--no-history',
    '--api-key',
    '--client-id',
    '--client-secret',
    '--host',
    '--credentials-file',
    '--profile',
    '--spinner',
    '--verbose',
    '--json',
    '--yaml',
    '--output',
  ];

  const commandOptions: Record<string, string[]> = {
    accounts: ['--json', '--yaml', '--output'],
    acc: ['--json', '--yaml', '--output'], // alias for accounts
    ai: ['--filename', '--force', '--verbose'],
    balances: ['--json', '--yaml', '--output'],
    bal: ['--json', '--yaml', '--output'], // alias for balances
    bank: ['--verbose'],
    beneficiaries: ['--json', '--yaml', '--output'],
    cards: ['--json', '--yaml', '--output'],
    c: ['--json', '--yaml', '--output'], // alias for cards
    config: ['--card-key', '--openai-key', '--sandbox-key'],
    cfg: ['--card-key', '--openai-key', '--sandbox-key'], // alias for config
    countries: ['--json', '--yaml', '--output'],
    currencies: ['--json', '--yaml', '--output'],
    deploy: ['--filename', '--env', '--card-key', '--yes'],
    d: ['--filename', '--env', '--card-key', '--yes'], // alias for deploy
    disable: ['--card-key', '--yes'],
    enable: ['--card-key'],
    env: ['--filename', '--card-key'],
    'env-list': ['--json', '--yaml', '--output'],
    fetch: ['--filename', '--card-key'],
    f: ['--filename', '--card-key'], // alias for fetch
    login: ['--email', '--password'],
    logs: ['--filename', '--card-key'],
    log: ['--filename', '--card-key'], // alias for logs
    merchants: ['--json', '--yaml', '--output'],
    new: ['--template', '--force', '--verbose'],
    pay: ['--yes'],
    publish: ['--filename', '--code-id', '--card-key', '--yes'],
    pub: ['--filename', '--code-id', '--card-key', '--yes'], // alias for publish
    published: ['--filename', '--card-key'],
    register: ['--email', '--password'],
    run: ['--filename', '--env', '--amount', '--currency', '--mcc', '--merchant', '--city', '--country', '--verbose'],
    r: ['--filename', '--env', '--amount', '--currency', '--mcc', '--merchant', '--city', '--country', '--verbose'], // alias for run
    simulate: ['--filename', '--card-key', '--env', '--amount', '--currency', '--mcc', '--merchant', '--city', '--country', '--verbose'],
    transfer: ['--yes'],
    transactions: ['--json', '--yaml', '--output'],
    tx: ['--json', '--yaml', '--output'], // alias for transactions
    upload: ['--filename', '--card-key'],
    up: ['--filename', '--card-key'], // alias for upload
    'upload-env': ['--filename', '--card-key'],
  };

  if (shell === 'bash') {
    return generateBashCompletion(commands, globalOptions, commandOptions);
  } else {
    return generateZshCompletion(commands, globalOptions, commandOptions);
  }
}

/**
 * Generates bash completion script.
 */
function generateBashCompletion(
  commands: string[],
  globalOptions: string[],
  commandOptions: Record<string, string[]>
): string {
  const commandsList = commands.join(' ');
  const globalOptionsList = globalOptions.join(' ');

  return `#!/usr/bin/env bash
# Bash completion script for ipb CLI

_ipb() {
  local cur prev words cword
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  words=("\${COMP_WORDS[@]}")
  cword=$COMP_CWORD

  case "\${prev}" in
    --output)
      COMPREPLY=($(compgen -f -- "\${cur}"))
      return 0
      ;;
    --filename|-f)
      COMPREPLY=($(compgen -f -X '!*.js' -- "\${cur}"))
      return 0
      ;;
    --template)
      COMPREPLY=($(compgen -W "default petro" -- "\${cur}"))
      return 0
      ;;
    --env|-e)
      # Complete .env.* files
      COMPREPLY=($(compgen -f -X '!*.env.*' -- "\${cur}"))
      return 0
      ;;
    --email|-e)
      # No completion for email
      return 0
      ;;
    --password|-p)
      # No completion for password
      return 0
      ;;
  esac

  # Check if we're completing a command
  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=($(compgen -W "${commandsList}" -- "\${cur}"))
    return 0
  fi

  # Get the command name
  local cmd="\${words[1]}"

  # Complete options for specific commands
  case "\${cmd}" in
${commands
  .map(
    (cmd) => `    ${cmd})
      local opts="${commandOptions[cmd]?.join(' ') || ''} ${globalOptionsList}"
      COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
      return 0
      ;;`
  )
  .join('\n')}
    *)
      # Default: complete global options
      COMPREPLY=($(compgen -W "${globalOptionsList}" -- "\${cur}"))
      return 0
      ;;
  esac
}

complete -F _ipb ipb
`;
}

/**
 * Generates zsh completion script.
 */
function generateZshCompletion(
  commands: string[],
  globalOptions: string[],
  commandOptions: Record<string, string[]>
): string {
  return `#compdef ipb
# Zsh completion script for ipb CLI

_ipb() {
  local -a commands
  commands=(
${commands.map((cmd) => `    '${cmd}:${cmd} command'`).join('\n')}
  )

  local -a global_opts
  global_opts=(
${globalOptions.map((opt) => `    '${opt}'`).join('\n')}
  )

  local context state line
  typeset -A opt_args

  _arguments -C \\
    "1: :->commands" \\
    "*::arg:->args"

  case $state in
    commands)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
${commands
  .map((cmd) => {
    const opts = commandOptions[cmd] || [];
    const allOpts = [...opts, ...globalOptions];
    return `        ${cmd})
          _arguments \\
${allOpts
  .map((opt) => {
    if (opt.includes('--filename') || opt.includes('-f')) {
      return `            '${opt}[JavaScript file]:file:_files -g "*.js"'`;
    }
    if (opt.includes('--output')) {
      return `            '${opt}[Output file]:file:_files'`;
    }
    if (opt.includes('--template')) {
      return `            '${opt}[Template]:template:(default petro)'`;
    }
    if (opt.includes('--env') || opt.includes('-e')) {
      return `            '${opt}[Environment file]:env:_files -g ".env.*"'`;
    }
    if (opt.includes('--email')) {
      return `            '${opt}[Email address]:email:'`;
    }
    if (opt.includes('--password')) {
      return `            '${opt}[Password]:password:'`;
    }
    if (opt.includes('<')) {
      const match = opt.match(/--([^<]+)\s*<([^>]+)>/);
      if (match && match[1] && match[2]) {
        const optName = match[1].replace(/-/g, '_');
        const argName = match[2];
        return `            '${opt}[${argName}]:${optName}:'`;
      }
    }
    return `            '${opt}'`;
  })
  .join(' \\\n')}
          ;;
`;
  })
  .join('')}        *)
          _arguments $global_opts
          ;;
      esac
      ;;
  esac
}

_ipb "$@"
`;
}

async function main() {
  program.name('ipb').description('CLI to manage Investec Programmable Banking').version(version);
  
  // Add global options
  program.option('--check-updates', 'Check for available updates');
  program.option('--no-history', 'Disable command history logging');
  
  // Add help text with command categories
  program.addHelpText('afterAll', `
Command Categories:
  Card Management        cards, enable, disable
  Code Management        deploy, fetch, upload, publish, published, logs, run, simulate
  Environment Management env, env-list, upload-env
  Account Management     accounts, balances, transactions, beneficiaries
  Payments              transfer, pay
  Configuration         config
  AI & Code Generation  ai, bank, new
  Authentication        login, register
  Reference Data        currencies, countries, merchants
  Utilities             completion

For more information about a specific command, use:
  $ ipb <command> --help
`);

  // Use shared options for most commands
  
  // Card Management
  addApiCredentialOptions(
    program
      .command('cards')
      .alias('c')
      .description('List all programmable cards. Shows card keys, numbers, and activation status for each card.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb cards
  $ ipb cards --json
  $ ipb cards --yaml
  $ ipb cards --output cards.json
  $ ipb cards --yaml --output cards.yaml
      `
      )
  ).action(withCommandContext('cards', cardsCommand));
  // Configuration
  const configCmd = program
    .command('config')
    .alias('cfg')
    .description('Configure authentication credentials. Set API keys, client credentials, and card keys for CLI operations. Supports configuration profiles for managing multiple environments.')
    .addHelpText(
      'after',
      `
Examples:
  # Save to default credentials
  $ ipb config --client-id <id> --client-secret <secret> --api-key <key>
  $ ipb config --card-key <card-key>
  
  # Save to a profile
  $ ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>
  $ ipb config --profile staging --client-id <id> --client-secret <secret> --api-key <key>
  
  # List profiles
  $ ipb config profile list
  
  # Set active profile
  $ ipb config profile set production
  
  # Show active profile
  $ ipb config profile show
  
  # Delete a profile
  $ ipb config profile delete staging
      `
    );
  
  addApiCredentialOptions(configCmd)
    .option('--card-key <cardKey>', 'Set your card key for the Investec API')
    .option('--openai-key <openaiKey>', 'Set your OpenAI API key for AI code generation')
    .option('--sandbox-key <sandboxKey>', 'Set your sandbox key for AI generation')
    .action(withCommandContext('config', configCommand));
  
  // Profile subcommands
  const profileCmd = configCmd
    .command('profile')
    .description('Manage configuration profiles');
  
  profileCmd
    .command('list')
    .alias('ls')
    .description('List all available configuration profiles')
    .action(async () => {
      const { listProfiles, getActiveProfile } = await import('./utils.js');
      const profiles = await listProfiles();
      if (profiles.length === 0) {
        console.log('No profiles found. Create one with: ipb config --profile <name> --client-id <id> --client-secret <secret> --api-key <key>');
      } else {
        const activeProfile = await getActiveProfile();
        console.log('Available profiles:');
        for (const profile of profiles) {
          const marker = profile === activeProfile ? ' (active)' : '';
          console.log(`  - ${profile}${marker}`);
        }
      }
    });
  
  profileCmd
    .command('set')
    .description('Set the active profile (used when --profile is not specified)')
    .argument('<profile>', 'Profile name to set as active')
    .action(async (profileName: string) => {
      const { readProfile, setActiveProfile } = await import('./utils.js');
      const { CliError, ERROR_CODES } = await import('./errors.js');
      try {
        await readProfile(profileName);
        await setActiveProfile(profileName);
        console.log(`✅ Active profile set to: ${profileName}`);
      } catch (error) {
        if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
          throw new CliError(
            ERROR_CODES.FILE_NOT_FOUND,
            `Profile "${profileName}" does not exist. Create it first with: ipb config --profile ${profileName} --client-id <id> --client-secret <secret> --api-key <key>`
          );
        }
        throw error;
      }
    });
  
  profileCmd
    .command('show')
    .description('Show the currently active profile')
    .action(async () => {
      const { getActiveProfile } = await import('./utils.js');
      const activeProfile = await getActiveProfile();
      if (activeProfile) {
        console.log(`Active profile: ${activeProfile}`);
      } else {
        console.log('No active profile set. Using default credentials.');
      }
    });
  
  profileCmd
    .command('delete')
    .alias('rm')
    .description('Delete a configuration profile')
    .argument('<profile>', 'Profile name to delete')
    .action(async (profileName: string) => {
      const { deleteProfile, getActiveProfile, setActiveProfile } = await import('./utils.js');
      await deleteProfile(profileName);
      // If the deleted profile was active, clear the active profile
      const activeProfile = await getActiveProfile();
      if (activeProfile === profileName) {
        await setActiveProfile(null);
        console.log(`✅ Profile "${profileName}" deleted and cleared from active profile.`);
      } else {
        console.log(`✅ Profile "${profileName}" deleted.`);
      }
    });
  // Code Management
  addApiCredentialOptions(
    program
      .command('deploy')
      .alias('d')
      .description('Deploy JavaScript code to a programmable card. Uploads code and optional environment variables, then publishes it to make it active.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb deploy -f main.js -e production -c card-123
  $ ipb deploy -f app.js --env dev --card-key card-456
  $ ipb deploy -f main.js -c card-789  # Deploy without environment variables
  $ ipb deploy -f main.js -c card-123 --yes  # Skip confirmation prompt
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'JavaScript file to deploy')
    .option('-e,--env <env>', 'Environment name (loads variables from .env.<env> file)')
    .option('-c,--card-key <cardKey>', 'Card identifier to deploy to')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(withCommandContext('deploy', deployCommand));
  addApiCredentialOptions(
    program
      .command('logs')
      .alias('log')
      .description('Fetch execution logs from a card. Retrieves transaction execution logs and saves them to a JSON file.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb logs -f executions.json -c card-123
  $ ipb logs -f logs.json --card-key card-456
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'Output filename for logs (JSON format)')
    .option('-c,--card-key <cardKey>', 'Card identifier to fetch logs from')
    .action(withCommandContext('logs', logsCommand));
  program
    .command('run')
    .alias('r')
    .description('Run card code locally using the emulator. Test JavaScript code with simulated transactions without deploying to a card.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb run -f main.js -e prod --amount 60000 --currency ZAR
  $ ipb run -f app.js --amount 10000 --merchant "Test Store" --city "Cape Town"
      `
    )
    .requiredOption('-f,--filename <filename>', 'JavaScript file to execute')
    .option('-e,--env <env>', 'Environment file to load (.env.<env>)')
    .option('-a,--amount <amount>', 'Transaction amount in cents', '10000')
    .option('-u,--currency <currency>', 'Currency code (ISO 4217)', 'zar')
    .option('-z,--mcc <mcc>', 'Merchant category code', '0000')
    .option('-m,--merchant <merchant>', 'Merchant name', 'The Coders Bakery')
    .option('-i,--city <city>', 'Merchant city', 'Cape Town')
    .option('-o,--country <country>', 'Country code (ISO 3166-1 alpha-2)', 'ZA')
    .option('-v,--verbose', 'Show detailed execution logs')
    .action(withCommandContext('run', runCommand));
  addApiCredentialOptions(
    program
      .command('fetch')
      .alias('f')
      .description('Fetch saved code from a card. Downloads the code currently saved on a card and saves it to a local file.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb fetch -f saved-code.js -c card-123
  $ ipb fetch -f backup.js --card-key card-456
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'Local filename to save the code to')
    .option('-c,--card-key <cardKey>', 'Card identifier to fetch code from')
    .action(withCommandContext('fetch', fetchCommand));
  addApiCredentialOptions(
    program
      .command('upload')
      .alias('up')
      .description('Upload code to a card without publishing. Saves JavaScript code to a card but does not activate it. Use publish command to activate.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb upload -f main.js -c card-123
  $ ipb upload -f app.js --card-key card-456
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'JavaScript file to upload')
    .option('-c,--card-key <cardKey>', 'Card identifier to upload code to')
    .action(withCommandContext('upload', uploadCommand));
  // Environment Management
  addApiCredentialOptions(
    program
      .command('env')
      .description('Download environment variables from a card. Retrieves all environment variables configured on a card and saves them to a JSON file.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb env -f env.json -c card-123
  $ ipb env -f variables.json --card-key card-456
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'Output filename for environment variables (JSON format)')
    .option('-c,--card-key <cardKey>', 'Card identifier to fetch environment from')
    .action(withCommandContext('env', envCommand));
  addApiCredentialOptions(
    program
      .command('env-list')
      .description('List all supported environment variables. Shows available environment variables with descriptions, usage examples, and default values.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb env-list
  $ ipb env-list --json
  $ ipb env-list --yaml --output env-vars.yaml
      `
      )
  ).action(withCommandContext('env-list', envListCommand));
  addApiCredentialOptions(
    program
      .command('upload-env')
      .description('Upload environment variables to a card. Reads environment variables from a JSON file and uploads them to a card.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb upload-env -f env.json -c card-123
  $ ipb upload-env -f variables.json --card-key card-456
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'JSON file containing environment variables')
    .option('-c,--card-key <cardKey>', 'Card identifier to upload environment to')
    .action(withCommandContext('upload-env', uploadEnvCommand));
  addApiCredentialOptions(
    program
      .command('published')
      .description('Download the currently published code from a card. Retrieves the active code currently running on a card and saves it to a local file.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb published -f published-code.js -c card-123
  $ ipb published -f active.js --card-key card-456
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'Local filename to save the published code to')
    .option('-c,--card-key <cardKey>', 'Card identifier to fetch published code from')
    .action(withCommandContext('published', publishedCommand));
  addApiCredentialOptions(
    program
      .command('publish')
      .alias('pub')
      .description('Publish previously uploaded code to make it active. Activates code that was uploaded using the upload command. Requires code ID from upload.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb publish -f main.js --code-id code-123 -c card-456
  $ ipb publish -f app.js -i code-789 --card-key card-123
  $ ipb publish -f main.js --code-id code-123 -c card-456 --yes  # Skip confirmation
      `
      )
  )
    .requiredOption('-f,--filename <filename>', 'JavaScript file to publish (must match uploaded code)')
    .requiredOption('-i,--code-id <codeId>', 'Code ID from previous upload command')
    .option('-c,--card-key <cardKey>', 'Card identifier to publish code to')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(withCommandContext('publish', publishCommand));
  program
    .command('simulate')
    .description('Test code using the online simulator. Runs JavaScript code in the Investec cloud environment with simulated transactions. Similar to run but uses cloud infrastructure.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb simulate -f main.js -c card-123 --amount 60000 --currency ZAR
  $ ipb simulate -f app.js --card-key card-456 --env production
      `
    )
    .requiredOption('-f,--filename <filename>', 'JavaScript file to simulate (required)')
    .option('-c,--card-key <cardKey>', 'Card identifier for simulation')
    .option('-e,--env <env>', 'Environment name', 'development')
    .option('-a,--amount <amount>', 'Transaction amount in cents', '10000')
    .option('-u,--currency <currency>', 'Currency code (ISO 4217)', 'zar')
    .option('-z,--mcc <mcc>', 'Merchant category code', '0000')
    .option('-m,--merchant <merchant>', 'Merchant name', 'The Coders Bakery')
    .option('-i,--city <city>', 'Merchant city', 'Cape Town')
    .option('-o,--country <country>', 'Country code (ISO 3166-1 alpha-2)', 'ZA')
    .option('-v,--verbose', 'Show detailed execution logs')
    .action(withCommandContext('simulate', simulateCommand));
  addApiCredentialOptions(
    program
      .command('enable')
      .description('Enable programmable code on a card. Activates programmable card functionality. Code must be deployed and published first.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb enable -c card-123
  $ ipb enable --card-key card-456
      `
      )
  )
    .option('-c,--card-key <cardKey>', 'Card identifier to enable code on')
    .action(withCommandContext('enable', enableCommand));
  addApiCredentialOptions(
    program
      .command('disable')
      .description('Disable programmable code on a card. Deactivates programmable card functionality. Code remains deployed but will not execute on transactions.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb disable -c card-123
  $ ipb disable --card-key card-456
  $ ipb disable -c card-123 --yes  # Skip confirmation
      `
      )
  )
    .option('-c,--card-key <cardKey>', 'Card identifier to disable code on')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(withCommandContext('disable', disableCommand));
  // Reference Data
  addApiCredentialOptions(
    program
      .command('currencies')
      .description('List all supported currency codes. Shows ISO 4217 currency codes and names available for use in transaction simulations and operations.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb currencies
  $ ipb currencies --json
  $ ipb currencies --yaml
  $ ipb currencies --output currencies.json
      `
      )
  ).action(withCommandContext('currencies', currenciesCommand));
  addApiCredentialOptions(
    program
      .command('countries')
      .description('List all supported country codes. Shows ISO 3166-1 alpha-2 country codes and names available for use in transaction simulations.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb countries
  $ ipb countries --json
  $ ipb countries --yaml
  $ ipb countries --output countries.json
      `
      )
  ).action(withCommandContext('countries', countriesCommand));
  addApiCredentialOptions(
    program
      .command('merchants')
      .description('List merchant categories and codes. Shows merchant category codes (MCC) with descriptions for use in transaction simulations.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb merchants
  $ ipb merchants --json
  $ ipb merchants --yaml
  $ ipb merchants --output merchants.json
      `
      )
  ).action(withCommandContext('merchants', merchantsCommand));
  // Account Management
  addApiCredentialOptions(
    program
      .command('accounts')
      .alias('acc')
      .description('List all Investec accounts. Shows account IDs, account numbers, product names, and reference names for all linked accounts.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb accounts
  $ ipb accounts --json
  $ ipb accounts --yaml
  $ ipb accounts --output accounts.json
      `
      )
  ).action(withCommandContext('accounts', accountsCommand));
  addApiCredentialOptions(
    program
      .command('balances')
      .alias('bal')
      .description('Get account balance information. Retrieves current balance, available balance, and budget balance for a specific account.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb balances <accountId>
  $ ipb balances acc-123 --json
  $ ipb balances acc-123 --yaml
  $ ipb balances acc-123 --output balance.json
      `
      )
  )
    .argument('accountId', 'Account ID to fetch balances for')
    .action(withCommandContext('balances', balancesCommand));
  // Payments
  addApiCredentialOptions(
    program
      .command('transfer')
      .description('Transfer money between your own accounts. Moves funds from one account to another. Prompts interactively for missing information.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb transfer <accountId> <beneficiaryAccountId> <amount> <reference>
  $ ipb transfer acc-123 acc-456 100.50 "Payment for services"
  $ ipb transfer acc-123 acc-456 100.50 "Payment" --yes  # Skip confirmation
      `
      )
  )
    .argument('accountId', 'Account ID to transfer from')
    .argument('beneficiaryAccountId', 'Beneficiary account ID to transfer to')
    .argument('amount', 'Amount to transfer in rands (e.g. 100.00)')
    .argument('reference', 'Payment reference message')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(withCommandContext('transfer', transferCommand));
  addApiCredentialOptions(
    program
      .command('pay')
      .description('Pay a beneficiary from your account. Makes a payment to a registered beneficiary. Requires confirmation before executing.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb pay <accountId> <beneficiaryId> <amount> <reference>
  $ ipb pay acc-123 ben-456 250.00 "Monthly subscription"
  $ ipb pay acc-123 ben-456 250.00 "Payment" --yes  # Skip confirmation
      `
      )
  )
    .argument('accountId', 'Account ID to pay from')
    .argument('beneficiaryId', 'Beneficiary ID to pay to')
    .argument('amount', 'Amount to pay in rands (e.g. 100.00)')
    .argument('reference', 'Payment reference message')
    .option('--yes', 'Skip confirmation prompt for destructive operations')
    .action(withCommandContext('pay', payCommand));
  addApiCredentialOptions(
    program
      .command('transactions')
      .alias('tx')
      .description('Get transaction history for an account. Retrieves and displays recent transactions with full details including amounts, dates, and merchants.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb transactions <accountId>
  $ ipb transactions acc-123 --json
  $ ipb transactions acc-123 --yaml
  $ ipb transactions acc-123 --output transactions.json
      `
      )
  )
    .argument('accountId', 'Account ID to fetch transactions for')
    .action(withCommandContext('transactions', transactionsCommand));
  addApiCredentialOptions(
    program
      .command('beneficiaries')
      .description('List all beneficiaries. Shows all registered beneficiaries linked to your Investec profile with their IDs and details.')
      .addHelpText(
        'after',
        `
Examples:
  $ ipb beneficiaries
  $ ipb beneficiaries --json
  $ ipb beneficiaries --yaml
  $ ipb beneficiaries --output beneficiaries.json
      `
      )
  ).action(withCommandContext('beneficiaries', beneficiariesCommand));
  // AI & Code Generation
  program
    .command('new')
    .description('Create a new project with scaffolding. Generates a new project directory with template files and directory structure for card code development.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb new my-project
  $ ipb new my-app --template petro
  $ ipb new my-project --force
      `
    )
    .argument('name', 'Project name (will create a directory with this name)')
    .option('-v,--verbose', 'Show detailed output during project creation')
    .option('--force', 'Overwrite existing project directory if it exists')
    .addOption(
      new Option('--template <template>', 'Template to use for project structure')
        .default('default')
        .choices(['default', 'petro'])
    )
    .action(withCommandContext('new', newCommand));
  program
    .command('ai')
    .description('Generate programmable card code using AI. Creates JavaScript code for programmable cards from natural language descriptions using OpenAI or sandbox service.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb ai "block transactions over R1000"
  $ ipb ai "only allow transactions at Woolworths" -f rules.js
  $ ipb ai "send SMS notification after payment" --force
      `
    )
    .argument('prompt', 'Natural language description of the card code behavior')
    .option('-f,--filename <filename>', 'Output filename for generated code', 'ai-generated.js')
    .option('-v,--verbose', 'Show detailed generation process')
    .option('--force', 'Overwrite existing file if it exists')
    .action(withCommandContext('ai', generateCommand));
  program
    .command('bank')
    .description('Use AI to interact with your bank account. Performs banking operations using natural language prompts. Uses AI to interpret requests and execute appropriate banking functions.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb bank "Show me my last 5 transactions"
  $ ipb bank "What is my account balance?"
  $ ipb bank "Transfer R100 to account acc-123"
      `
    )
    .argument('prompt', 'Natural language description of the banking operation to perform')
    .option('-v,--verbose', 'Show detailed AI interaction and function calls')
    .action(withCommandContext('bank', bankCommand));
  // Authentication
  program
    .command('register')
    .description('Register for the sandbox AI service. Creates an account for using AI code generation features without requiring your own OpenAI API key.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb register -e user@example.com -p securepassword
  $ ipb register --email user@example.com --password securepassword
      
Note: After registration, message in #12_sandbox-playground with your email to activate your account.
      `
    )
    .option('-e,--email <email>', 'Email address for registration')
    .option('-p,--password <password>', 'Password for your account')
    .action(withCommandContext('register', registerCommand));
  program
    .command('login')
    .description('Login to the sandbox AI service. Authenticates with the sandbox service and saves access token for use with AI generation commands.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb login -e user@example.com -p securepassword
  $ ipb login --email user@example.com --password securepassword
      `
    )
    .option('-e,--email <email>', 'Your registered email address')
    .option('-p,--password <password>', 'Your account password')
    .action(withCommandContext('login', loginCommand));
  // Utilities
  program
    .command('completion')
    .description('Generate shell completion script. Creates autocomplete scripts for bash or zsh to enable tab completion for commands and options.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb completion bash > /etc/bash_completion.d/ipb
  $ ipb completion zsh > ~/.zsh/completions/_ipb
  $ source <(ipb completion bash)  # For current session only
      `
    )
    .argument('<shell>', 'Shell type (bash or zsh)')
    .action((shell) => {
      try {
        const completionScript = generateCompletionScript(shell);
        console.log(completionScript);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error generating completion script: ${errorMessage}`));
        // Use validation error for unsupported shell, general error for other issues
        const exitCode = errorMessage.includes('Unsupported shell') 
          ? ExitCode.VALIDATION_ERROR 
          : ExitCode.GENERAL_ERROR;
        process.exit(exitCode);
      }
    });
  
  // Documentation generation command
  program
    .command('docs')
    .description('Generate command documentation. Creates markdown documentation from CLI command definitions and writes it to GENERATED_README.md.')
    .addHelpText(
      'after',
      `
Examples:
  $ ipb docs
  $ ipb docs --output COMMANDS.md
      `
    )
    .option('--output <file>', 'Output file path (default: GENERATED_README.md)')
    .action(async (options: { output?: string }) => {
      const { docsCommand } = await import('./cmds/docs.js');
      await docsCommand(options.output || 'GENERATED_README.md', program);
    });

  // Check for --check-updates flag in raw arguments
  const hasCheckUpdatesFlag = process.argv.includes('--check-updates');
  
  // If --check-updates flag is present, handle it before parsing
  if (hasCheckUpdatesFlag && process.argv.length === 3) {
    // Only --check-updates flag, no command
    const latestVersion = await checkForUpdates(version, true);
    if (latestVersion) {
      showUpdateNotification(version, latestVersion);
    } else {
      console.log(chalk.green('✓ You are using the latest version.'));
    }
    process.exit(0);
  }
  
  // Check if stdout is piped before parsing
  const { isStdoutPiped } = await import('./utils.js');
  const isPiped = isStdoutPiped();
  
  // Track command execution for history logging
  const startTime = Date.now();
  let commandName = '';
  let commandArgs: string[] = [];
  let commandOptions: Record<string, unknown> = {};
  let exitCode = 0;
  
  // Hook into command execution to capture command details
  program.hook('preAction', (thisCommand) => {
    commandName = thisCommand.name() || (thisCommand.parent?.name() || '');
    commandArgs = thisCommand.args || [];
    // Merge global options and command-specific options
    const globalOpts = program.opts();
    const commandOpts = thisCommand.opts();
    commandOptions = { ...globalOpts, ...commandOpts };
  });
  
  try {
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
        logCommandHistory(actualCommandName, actualArgs, allOptions, exitCode, duration).catch(() => {
          // Ignore errors
        });
      }
    } catch {
      // Ignore errors logging history
    }
  }
  
  // Check for updates after command execution (with rate limiting, unless --check-updates flag is used)
  if (hasCheckUpdatesFlag && process.argv.length > 3) {
    // --check-updates flag with a command - check after command execution
    const latestVersion = await checkForUpdates(version, true);
    if (latestVersion) {
      showUpdateNotification(version, latestVersion);
    } else {
      console.log(chalk.green('✓ You are using the latest version.'));
    }
  } else if (process.argv.length === 2) {
    // No arguments provided (shouldn't happen due to early exit, but just in case)
    const latestVersion = await checkForUpdates(version, false);
    if (latestVersion) {
      showUpdateNotification(version, latestVersion);
    }
  } else if (!hasCheckUpdatesFlag) {
    // Background check for regular commands (non-blocking, cached for 24 hours)
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
  
  // Only add newline if not piped (to avoid corrupting JSON output)
  if (!isPiped) {
    console.log(''); // Add a newline after command execution
  }
}

/**
 * Merges CLI options with credentials, applying option overrides.
 * @param options - Basic options that may contain credential overrides
 * @param credentials - Base credentials object
 * @returns Updated credentials object with option overrides applied
 */
export async function optionCredentials(
  options: BasicOptions & { profile?: string },
  credentials: Credentials
): Promise<Credentials> {
  // Load profile if specified (takes precedence over credentials file)
  if (options.profile) {
    const { loadProfile } = await import('./utils.js');
    credentials = await loadProfile(credentials, options.profile);
  } else {
    // Check for active profile if no profile specified
    const { getActiveProfile, loadProfile } = await import('./utils.js');
    const activeProfile = await getActiveProfile();
    if (activeProfile) {
      credentials = await loadProfile(credentials, activeProfile);
    }
    
    // Fall back to credentials file if no profile is active
    if (options.credentialsFile) {
      credentials = await loadCredentialsFile(credentials, options.credentialsFile);
    }
  }
  
  // Command-line options always override profile/credentials file
  if (options.apiKey) {
    credentials.apiKey = options.apiKey;
  }
  if (options.clientId) {
    credentials.clientId = options.clientId;
  }
  if (options.clientSecret) {
    credentials.clientSecret = options.clientSecret;
  }
  if (options.host) {
    credentials.host = options.host;
  }
  return credentials;
}

main().catch((err) => {
  const commandContext = (err as Error & { commandContext?: string })?.commandContext;
  const context = commandContext ? `${commandContext} command` : 'run CLI';
  handleCliError(err, { verbose: true }, context);
});
