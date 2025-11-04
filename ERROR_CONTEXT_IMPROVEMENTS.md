# Error Context Message Improvements

## Current State

After removing redundant try-catch blocks, all errors now propagate to `main().catch()` which uses a generic context message: `"run CLI"`. This results in less helpful error messages like:

```
Failed to run CLI: <error message>
```

## Problem

Users lose context about which specific command failed, making debugging more difficult.

## Proposed Solutions

### Option 1: Capture Command Name from Commander.js (Recommended)

**Approach**: Use Commander.js's built-in error handling and command tracking.

**Implementation**:
```typescript
// In src/index.ts
async function main() {
  program.name('ipb').description('CLI to manage Investec Programmable Banking').version(version);
  
  // ... all command definitions ...

  // Wrap each command action to capture command name
  const wrapCommand = (commandName: string, handler: (...args: any[]) => Promise<void>) => {
    return async (...args: any[]) => {
      try {
        await handler(...args);
      } catch (error) {
        // Attach command context to error
        if (error instanceof Error) {
          (error as any).commandName = commandName;
        }
        throw error;
      }
    };
  };

  // Apply wrapper to commands
  program.command('accounts').action(wrapCommand('accounts', accountsCommand));
  program.command('deploy').action(wrapCommand('deploy', deployCommand));
  // ... etc

  await program.parseAsync(process.argv);
  console.log('');
}

main().catch((err) => {
  const commandName = (err as any)?.commandName || program.args[0] || 'CLI';
  const context = commandName === 'CLI' ? 'run CLI' : `${commandName} command`;
  handleCliError(err, { verbose: true }, context);
});
```

**Pros**:
- Automatic command name detection
- Minimal code changes
- Works with existing error propagation

**Cons**:
- Requires wrapping each command (but can be done programmatically)

---

### Option 2: Use Commander.js Error Handling Hook

**Approach**: Leverage Commander.js's error handling capabilities.

**Implementation**:
```typescript
// In src/index.ts
program.configureOutput({
  writeErr: (str) => {
    // Commander.js handles its own errors
    process.stderr.write(str);
  },
});

// Add global error handler
program.on('command:*', () => {
  console.error('Unknown command: %s\nSee --help for available commands', program.args.join(' '));
  process.exit(1);
});

// Wrap parseAsync to capture command name
async function main() {
  // ... command setup ...
  
  try {
    await program.parseAsync(process.argv);
    console.log('');
  } catch (error) {
    // Get command name from parsed args
    const commandName = program.args[0] || 'CLI';
    const context = commandName === 'CLI' ? 'run CLI' : `${commandName} command`;
    handleCliError(error, { verbose: true }, context);
    process.exit(1);
  }
}

main().catch((err) => {
  handleCliError(err, { verbose: true }, 'run CLI');
});
```

**Pros**:
- Uses Commander.js built-in features
- Handles unknown commands gracefully

**Cons**:
- Requires parsing `program.args` which may not be reliable

---

### Option 3: Create Command Context Helper (Most Flexible)

**Approach**: Create a utility function that wraps commands with context.

**Implementation**:
```typescript
// In src/utils.ts
/**
 * Wraps a command function to automatically capture and attach command context to errors.
 * @param commandName - The name of the command (e.g., 'accounts', 'deploy')
 * @param handler - The command handler function
 * @returns Wrapped handler that attaches context to errors
 */
export function withCommandContext<T extends (...args: any[]) => Promise<any>>(
  commandName: string,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Attach command context to error
      if (error instanceof Error) {
        Object.defineProperty(error, 'commandContext', {
          value: commandName,
          writable: false,
          enumerable: false,
          configurable: true,
        });
      }
      throw error;
    }
  }) as T;
}

// In src/index.ts
import { withCommandContext } from './utils.js';

async function main() {
  // ... command setup ...
  
  // Wrap commands with context
  program.command('accounts').action(withCommandContext('accounts', accountsCommand));
  program.command('deploy').action(withCommandContext('deploy', deployCommand));
  program.command('fetch').action(withCommandContext('fetch', fetchCommand));
  // ... etc

  await program.parseAsync(process.argv);
  console.log('');
}

main().catch((err) => {
  const commandContext = (err as Error & { commandContext?: string })?.commandContext;
  const context = commandContext 
    ? `${commandContext} command` 
    : 'run CLI';
  handleCliError(err, { verbose: true }, context);
});
```

**Pros**:
- Clean, reusable utility function
- Type-safe
- Explicit context for each command
- Easy to test

**Cons**:
- Requires wrapping each command manually

---

### Option 4: Enhanced Error Class with Context (Best for Future)

**Approach**: Extend CliError to include command context.

**Implementation**:
```typescript
// In src/errors.ts
export class CliError extends Error {
  code: string;
  commandContext?: string;
  
  constructor(code: string, message: string, commandContext?: string) {
    super(`Error (${code}): ${message}`);
    this.code = code;
    this.commandContext = commandContext;
    this.name = 'CliError';
  }
}

// In src/utils.ts
export function handleCliError(error: unknown, options: { verbose?: boolean }, context: string) {
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  
  // Use command context from CliError if available, otherwise use provided context
  const commandContext = error instanceof CliError && error.commandContext
    ? `${error.commandContext} command`
    : context;
  
  console.error(chalk.redBright(`Failed to ${commandContext}:`), errorMessage);
  console.log('');
  if (options.verbose) {
    console.error(error);
  }
  process.exit(1);
}

// In command files, throw CliError with context
export async function accountsCommand(options: CommonOptions) {
  try {
    // ... command logic ...
  } catch (error) {
    if (error instanceof CliError) {
      throw new CliError(error.code, error.message, 'accounts');
    }
    throw error;
  }
}
```

**Pros**:
- Context is part of error object
- Can be used throughout the error chain
- Most flexible for future needs

**Cons**:
- Requires modifying all error throws in commands
- More invasive change

---

## Recommended Solution: Option 3 (Command Context Helper)

**Why**: 
- Clean and maintainable
- Minimal changes to existing code
- Type-safe
- Easy to apply systematically
- Doesn't require changing error throwing logic in commands

**Implementation Steps**:

1. Create `withCommandContext` utility in `src/utils.ts`
2. Wrap all command actions in `src/index.ts`
3. Update `main().catch()` to extract context from error
4. Update error messages to be more user-friendly

**Example Output**:
- Before: `Failed to run CLI: File does not exist`
- After: `Failed to deploy command: File does not exist`

---

## Additional Improvements

### Standardize Context Message Format

**Current**: Mixed formats ("fetch accounts", "deploy code", "login")

**Proposed**: Consistent format: `"{command} command"`

**Examples**:
- `accounts command`
- `deploy command`
- `login command`
- `fetch command`

### Error Message Enhancement

Optionally include the command name in the error message itself:
```typescript
export function handleCliError(error: unknown, options: { verbose?: boolean }, context: string) {
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  
  // Format: "Failed to {command} command: {error message}"
  console.error(chalk.redBright(`Failed to ${context}:`), errorMessage);
  console.log('');
  if (options.verbose) {
    console.error(error);
  }
  process.exit(1);
}
```

---

## Implementation Checklist

- [ ] Create `withCommandContext` utility function
- [ ] Wrap all command actions in `src/index.ts`
- [ ] Update `main().catch()` to extract context
- [ ] Test error messages for all commands
- [ ] Update documentation
- [ ] Update `IMPLEMENTATION_STATUS.md`

