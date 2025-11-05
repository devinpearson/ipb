import { promises as fsPromises } from 'node:fs';
import { Command } from 'commander';
import chalk from 'chalk';
import { printTitleBox } from '../index.js';
import { validateFilePathForWrite } from '../utils.js';

/**
 * Interface for command information extracted from Commander.js
 */
interface CommandInfo {
  name: string;
  aliases: string[];
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
  options: Array<{ flags: string; description: string; required: boolean }>;
  examples: string;
  subcommands?: CommandInfo[];
}

/**
 * Extracts command information from a Commander.js command.
 * @param command - Commander.js command instance
 * @param globalOptionFlags - Set of global option flags to filter out
 * @returns Command information object
 */
function extractCommandInfo(command: Command, globalOptionFlags: Set<string> = new Set()): CommandInfo {
  const args: Array<{ name: string; description: string; required: boolean }> = [];
  const options: Array<{ flags: string; description: string; required: boolean }> = [];
  
  // Extract arguments using Commander.js internal API
  const registeredArgs = (command as any)._args || [];
  for (const arg of registeredArgs) {
    const argName = typeof arg.name === 'function' ? arg.name() : arg.name || '';
    const argDesc = arg.description || '';
    const argRequired = arg.required !== false;
    if (argName) {
      args.push({
        name: argName,
        description: argDesc,
        required: argRequired,
      });
    }
  }
  
  // Extract options (filter out global options)
  const registeredOptions = command.options || [];
  for (const option of registeredOptions) {
    const flags = option.flags || '';
    if (!flags) {
      continue;
    }
    
    // Check if this is a global option by checking if any of its flags are in the global set
    const flagParts = flags.split(',').map((f) => f.trim().split(/\s+/)[0]).filter((f): f is string => Boolean(f));
    const isGlobalOption = flagParts.some((flag) => globalOptionFlags.has(flag));
    
    // Skip global options (they're documented separately)
    if (isGlobalOption) {
      continue;
    }
    
    const desc = option.description || '';
    // Check if option is required by looking at the flag pattern (<value> vs [value])
    // Also check option.required property, but note that Commander.js doesn't always set this correctly
    const hasRequiredPattern = flags.includes('<');
    const required = option.required === true || hasRequiredPattern;
    options.push({ flags, description: desc, required });
  }
  
  // Extract examples from help text
  let examples = '';
  try {
    const helpText = command.helpInformation();
    const exampleMatch = helpText.match(/Examples:\s*\n((?:\s+\$[^\n]+\n?)+)/);
    if (exampleMatch && exampleMatch[1]) {
      examples = exampleMatch[1]
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.trim())
        .join('\n');
    }
  } catch {
    // If help generation fails, skip examples
  }
  
  // Extract subcommands
  const subcommands: CommandInfo[] = [];
  const subcmds = command.commands || [];
  for (const subcmd of subcmds) {
    const cmdName = subcmd.name();
    if (cmdName && cmdName !== '<command>') {
      subcommands.push(extractCommandInfo(subcmd, globalOptionFlags));
    }
  }
  
  return {
    name: command.name(),
    aliases: command.aliases(),
    description: command.description() || '',
    arguments: args,
    options,
    examples,
    subcommands: subcommands.length > 0 ? subcommands : undefined,
  };
}

/**
 * Formats command information as markdown.
 * @param commandInfo - Command information to format
 * @param level - Heading level (default: 2)
 * @param globalOptionFlags - Set of global option flags (for filtering)
 * @returns Markdown string
 */
function formatCommandAsMarkdown(commandInfo: CommandInfo, globalOptionFlags: Set<string> = new Set(), level = 2): string {
  const heading = '#'.repeat(level);
  const lines: string[] = [];
  
  // Command name and aliases
  let commandTitle = commandInfo.name;
  if (commandInfo.aliases.length > 0) {
    commandTitle += ` (aliases: ${commandInfo.aliases.join(', ')})`;
  }
  lines.push(`${heading} ${commandTitle}\n`);
  
  // Description
  if (commandInfo.description) {
    lines.push(`${commandInfo.description}\n`);
  }
  
  // Usage
  let usage = `\`ipb ${commandInfo.name}`;
  if (commandInfo.arguments.length > 0) {
    for (const arg of commandInfo.arguments) {
      if (arg.required) {
        usage += ` <${arg.name}>`;
      } else {
        usage += ` [${arg.name}]`;
      }
    }
  }
  usage += '`';
  lines.push(`**Usage:** ${usage}\n`);
  
  // Arguments
  if (commandInfo.arguments.length > 0) {
    lines.push('**Arguments:**');
    lines.push('');
    for (const arg of commandInfo.arguments) {
      const required = arg.required ? ' (required)' : ' (optional)';
      lines.push(`- \`<${arg.name}>\`${required}${arg.description ? ` - ${arg.description}` : ''}`);
    }
    lines.push('');
  }
  
  // Options
  if (commandInfo.options.length > 0) {
    lines.push('**Options:**');
    lines.push('');
    for (const opt of commandInfo.options) {
      const required = opt.required ? ' (required)' : '';
      lines.push(`- \`${opt.flags}\`${required}${opt.description ? ` - ${opt.description}` : ''}`);
    }
    lines.push('');
  }
  
  // Examples
  if (commandInfo.examples) {
    lines.push('**Examples:**');
    lines.push('');
    lines.push('```bash');
    const exampleLines = commandInfo.examples.split('\n').filter((line) => line.trim());
    for (const line of exampleLines) {
      lines.push(line);
    }
    lines.push('```');
    lines.push('');
  }
  
  // Subcommands
  if (commandInfo.subcommands && commandInfo.subcommands.length > 0) {
    lines.push('**Subcommands:**');
    lines.push('');
    for (const subcmd of commandInfo.subcommands) {
      lines.push(formatCommandAsMarkdown(subcmd, globalOptionFlags, level + 1));
    }
  }
  
  return lines.join('\n');
}

/**
 * Generates markdown documentation from Commander.js program.
 * @param program - Commander.js program instance
 * @returns Markdown documentation string
 */
export function generateCommandDocumentation(program: Command): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# IPB CLI Command Reference');
  lines.push('');
  lines.push('> This documentation is auto-generated from the CLI command definitions.');
  lines.push('> Last generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('## Table of Contents');
  lines.push('');
  
  // Collect global options first (for filtering)
  // Global options are: --check-updates, --no-history, and all options added via addApiCredentialOptions
  const globalOptionFlags = new Set<string>([
    '--check-updates',
    '--no-history',
    '--api-key',
    '--client-id',
    '--client-secret',
    '--host',
    '--credentials-file',
    '--profile',
    '--spinner',
    '-s',
    '--verbose',
    '-v',
    '--json',
    '--yaml',
    '--output',
  ]);
  
  // Also collect from program.options to be safe
  const globalOptions = program.options || [];
  for (const opt of globalOptions) {
    const flags = opt.flags || '';
    if (flags) {
      // Extract individual flag names (e.g., "--api-key <apiKey>" -> "--api-key")
      const flagParts = flags.split(',').map((f) => f.trim().split(/\s+/)[0]).filter((f): f is string => Boolean(f));
      for (const flag of flagParts) {
        if (flag) {
          globalOptionFlags.add(flag);
        }
      }
    }
  }
  
  // Collect all commands
  const commands: CommandInfo[] = [];
  const programCommands = program.commands || [];
  
  for (const cmd of programCommands) {
    const cmdName = cmd.name();
    if (cmdName && cmdName !== '<command>') {
      commands.push(extractCommandInfo(cmd, globalOptionFlags));
    }
  }
  
  // Generate table of contents
  for (const cmd of commands) {
    lines.push(`- [${cmd.name}](#${cmd.name.toLowerCase().replace(/\s+/g, '-')})`);
  }
  lines.push('');
  
  // Generate command documentation
  for (const cmd of commands) {
    lines.push(formatCommandAsMarkdown(cmd, globalOptionFlags));
    lines.push('');
  }
  
  // Global options section
  lines.push('## Global Options');
  lines.push('');
  lines.push('These options are available for all commands:');
  lines.push('');
  
  for (const opt of globalOptions) {
    const flags = opt.flags || '';
    const desc = opt.description || '';
    if (flags) {
      // Don't mark global options as required (they're usually optional)
      lines.push(`- \`${flags}\` - ${desc}`);
    }
  }
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generates and writes command documentation to a file.
 * @param outputPath - Path to write the documentation file
 * @param program - Commander.js program instance
 * @throws {Error} When file operations fail
 */
export async function docsCommand(outputPath: string, program: Command) {
  printTitleBox();
  
  console.log(chalk.blueBright('📚 Generating command documentation...'));
  
  // Generate documentation from the program
  const documentation = generateCommandDocumentation(program);
  
  // Validate and normalize output path
  const normalizedPath = await validateFilePathForWrite(outputPath);
  
  // Write to file
  await fsPromises.writeFile(normalizedPath, documentation, 'utf8');
  
  const commandCount = program.commands.length;
  console.log(chalk.green(`✅ Documentation generated successfully: ${normalizedPath}`));
  console.log(chalk.gray(`   Total commands documented: ${commandCount}`));
}

