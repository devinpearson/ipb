import { promises as fsPromises } from 'node:fs';
import chalk from 'chalk';
import type { Command } from 'commander';
import { printTitleBox } from '../index.js';
import {
  createSpinner,
  getSafeText,
  isStdoutPiped,
  resolveSpinnerState,
  validateFilePathForWrite,
  withSpinner,
} from '../utils.js';

/**
 * Interface for command information extracted from Commander.js
 */
interface CommandInfo {
  name: string;
  path: string; // Full command path (e.g., "beneficiaries list")
  aliases: string[];
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
  options: Array<{ flags: string; description: string; required: boolean }>;
  examples: string;
  subcommands?: CommandInfo[];
}

/**
 * Generates a GitHub-compatible slug from a heading text.
 * GitHub's slug algorithm:
 * - Lowercase the text
 * - Remove punctuation (parentheses, etc.)
 * - Replace spaces with hyphens
 * - Collapse consecutive hyphens
 * - Trim leading/trailing hyphens
 * @param text - The heading text to slugify
 * @returns GitHub-compatible slug
 */
/**
 * Commander marks hidden commands with `_hidden` (set via `.command(name, { hidden: true })`).
 */
function isCommandHidden(command: Command): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: Commander does not expose this on the public Command type
  return Boolean((command as any)._hidden);
}

function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation (parentheses, etc.)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Extracts command information from a Commander.js command.
 * @param command - Commander.js command instance
 * @param globalOptionFlags - Set of global option flags to filter out
 * @param parentPath - Full path of parent command (for nested subcommands)
 * @returns Command information object
 */
function extractCommandInfo(
  command: Command,
  globalOptionFlags: Set<string> = new Set(),
  parentPath: string = ''
): CommandInfo {
  const args: Array<{ name: string; description: string; required: boolean }> = [];
  const options: Array<{ flags: string; description: string; required: boolean }> = [];

  // Extract arguments using Commander.js internal API
  // biome-ignore lint/suspicious/noExplicitAny: Commander.js internal API is not fully typed
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
    const flagParts = flags
      .split(',')
      .map((f) => f.trim().split(/\s+/)[0])
      .filter((f): f is string => Boolean(f));
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
    if (exampleMatch?.[1]) {
      examples = exampleMatch[1]
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.trim())
        .join('\n');
    }
  } catch {
    // If help generation fails, skip examples
  }

  // Build full command path
  const cmdName = command.name();
  const fullPath = parentPath ? `${parentPath} ${cmdName}` : cmdName;

  // Extract subcommands
  const subcommands: CommandInfo[] = [];
  const subcmds = command.commands || [];
  for (const subcmd of subcmds) {
    const subcmdName = subcmd.name();
    if (subcmdName && subcmdName !== '<command>' && !isCommandHidden(subcmd)) {
      subcommands.push(extractCommandInfo(subcmd, globalOptionFlags, fullPath));
    }
  }

  return {
    name: cmdName,
    path: fullPath,
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
function formatCommandAsMarkdown(
  commandInfo: CommandInfo,
  globalOptionFlags: Set<string> = new Set(),
  level = 2
): string {
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

  // Usage - use full command path instead of just name
  let usage = `\`ipb ${commandInfo.path}`;
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
  lines.push(`> Last generated: ${new Date().toISOString()}`);
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
    '--no-spinner',
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
      const flagParts = flags
        .split(',')
        .map((f) => f.trim().split(/\s+/)[0])
        .filter((f): f is string => Boolean(f));
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
    if (cmdName && cmdName !== '<command>' && !isCommandHidden(cmd)) {
      commands.push(extractCommandInfo(cmd, globalOptionFlags));
    }
  }

  // Generate table of contents with GitHub-compatible slugs
  // Track base slugs to handle duplicates (GitHub appends -1, -2, etc. to duplicates)
  const slugCounts = new Map<string, number>();

  for (const cmd of commands) {
    // Build the heading text (same as what will be in the markdown)
    let headingText = cmd.name;
    if (cmd.aliases.length > 0) {
      headingText += ` (aliases: ${cmd.aliases.join(', ')})`;
    }

    // Generate base slug
    const baseSlug = githubSlug(headingText);

    // Handle duplicate slugs by appending -n (GitHub behavior)
    const count = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, count + 1);

    // First occurrence uses base slug, subsequent ones get -1, -2, etc.
    const slug = count > 0 ? `${baseSlug}-${count}` : baseSlug;

    lines.push(`- [${cmd.name}](#${slug})`);
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

export interface DocsCommandOptions {
  verbose?: boolean;
  spinner?: boolean;
}

/**
 * Generates and writes command documentation to a file.
 * @param outputPath - Path to write the documentation file
 * @param program - Commander.js program instance
 * @param options - Spinner / verbose (from CLI when wired)
 * @throws {Error} When file operations fail
 */
export async function docsCommand(
  outputPath: string,
  program: Command,
  options: DocsCommandOptions = {}
) {
  const isPiped = isStdoutPiped();
  if (!isPiped) {
    printTitleBox();
  }

  const { spinnerEnabled } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, getSafeText('📚 Generating documentation...'));

  await withSpinner(spinner, spinnerEnabled, async () => {
    const documentation = generateCommandDocumentation(program);
    const normalizedPath = await validateFilePathForWrite(outputPath);
    await fsPromises.writeFile(normalizedPath, documentation, 'utf8');
    const commandCount = program.commands.length;
    console.log(chalk.green(`✅ Documentation generated successfully: ${normalizedPath}`));
    console.log(chalk.gray(`   Total commands documented: ${commandCount}`));
  });
}
