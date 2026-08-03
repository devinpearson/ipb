// Bash/zsh completion script generation for the ipb CLI.

import { CliError, ERROR_CODES } from './errors.js';

/**
 * Generates shell completion script for bash or zsh.
 * @param shell - Shell type ('bash' or 'zsh')
 * @returns Completion script as a string
 */
export function generateCompletionScript(shell: string): string {
  if (shell !== 'bash' && shell !== 'zsh') {
    throw new CliError(
      ERROR_CODES.INVALID_INPUT,
      `Unsupported shell: ${shell}. Supported shells: bash, zsh`
    );
  }

  const commands = [
    'accounts',
    'acc', // alias for accounts
    'balances',
    'bal', // alias for balances
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
    'docs',
    'enable',
    'env',
    'env-list',
    'fetch',
    'f', // alias for fetch
    'logs',
    'log', // alias for logs
    'merchants',
    'new',
    'pay',
    'publish',
    'pub', // alias for publish
    'published',
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
    '--no-spinner',
    '--spinner',
    '--verbose',
    '--json',
    '--yaml',
    '--output',
  ];

  const commandOptions: Record<string, string[]> = {
    accounts: ['--json', '--yaml', '--output'],
    acc: ['--json', '--yaml', '--output'], // alias for accounts
    balances: ['--json', '--yaml', '--output'],
    bal: ['--json', '--yaml', '--output'], // alias for balances
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
    docs: ['--output'],
    enable: ['--card-key'],
    env: ['--filename', '--card-key'],
    'env-list': ['--json', '--yaml', '--output'],
    fetch: ['--filename', '--card-key'],
    f: ['--filename', '--card-key'], // alias for fetch
    logs: ['--filename', '--card-key'],
    log: ['--filename', '--card-key'], // alias for logs
    merchants: ['--json', '--yaml', '--output'],
    new: ['--template', '--force', '--verbose', '--spinner'],
    pay: ['--yes'],
    publish: ['--filename', '--code-id', '--card-key', '--yes'],
    pub: ['--filename', '--code-id', '--card-key', '--yes'], // alias for publish
    published: ['--filename', '--card-key'],
    run: [
      '--filename',
      '--env',
      '--amount',
      '--currency',
      '--mcc',
      '--merchant',
      '--city',
      '--country',
      '--verbose',
      '--spinner',
    ],
    r: [
      '--filename',
      '--env',
      '--amount',
      '--currency',
      '--mcc',
      '--merchant',
      '--city',
      '--country',
      '--verbose',
      '--spinner',
    ], // alias for run
    simulate: [
      '--filename',
      '--card-key',
      '--env',
      '--amount',
      '--currency',
      '--mcc',
      '--merchant',
      '--city',
      '--country',
      '--verbose',
      '--spinner',
      '--api-key',
      '--client-id',
      '--client-secret',
      '--host',
      '--credentials-file',
      '--profile',
      '--json',
      '--yaml',
      '--output',
    ],
    transfer: ['--yes'],
    transactions: ['--json', '--yaml', '--output'],
    tx: ['--json', '--yaml', '--output'], // alias for transactions
    upload: ['--filename', '--card-key'],
    up: ['--filename', '--card-key'], // alias for upload
    'upload-env': ['--filename', '--card-key'],
  };

  if (shell === 'bash') {
    return generateBashCompletion(commands, globalOptions, commandOptions);
  }
  return generateZshCompletion(commands, globalOptions, commandOptions);
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
  const configCommandOpts = `${commandOptions.config?.join(' ') || ''} ${globalOptionsList}`.trim();

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

  # Nested: ipb config|cfg [profile|edit|...options]
  if [[ "\${cmd}" == "config" || "\${cmd}" == "cfg" ]]; then
    if [[ \${cword} -eq 2 ]]; then
      local cfg_subcmds="profile edit"
      local cfg_opts="${configCommandOpts}"
      COMPREPLY=($(compgen -W "\${cfg_subcmds} \${cfg_opts}" -- "\${cur}"))
      return 0
    fi
    if [[ "\${words[2]}" == "profile" && \${cword} -eq 3 ]]; then
      COMPREPLY=($(compgen -W "list ls set show delete rm" -- "\${cur}"))
      return 0
    fi
  fi

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
      if (match?.[1] && match[2]) {
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
