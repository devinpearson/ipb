# Investec Programmable Banking CLI

## Project Overview

This is a command-line interface (CLI) tool for managing and interacting with Investec's Programmable Banking API. It allows users to deploy JavaScript code snippets to their programmable bank cards, which execute when transactions are made. The tool also provides commands for managing accounts, balances, transactions, beneficiaries, and more.

## Technology Stack

- **Runtime**: Node.js 22+ (ESM modules)
- **Language**: TypeScript 5.9+ with strict mode enabled
- **CLI Framework**: Commander.js 14.x
- **Testing**: Vitest 3.x
- **Linting/Formatting**: Biome 2.3.x
- **Build**: TypeScript compiler (tsc)
- **Package Manager**: npm

## Project Structure

```text
src/
  ├── index.ts          # Main entry point, command definitions, global options
  ├── utils.ts          # Shared utilities (error handling, credentials, formatting, etc.)
  ├── errors.ts         # Custom error classes and error codes
  ├── cmds/             # Command implementations
  │   ├── index.ts      # Command exports
  │   ├── types.ts      # Shared TypeScript interfaces
  │   └── *.ts          # Individual command files
  ├── mock-pb.ts        # Mock API for testing/development
  └── mock-card.ts      # Mock card API for testing

test/
  ├── __mocks__/        # Mock implementations for testing
  └── cmds/             # Command-specific tests

bin/                    # Compiled output (generated, not committed)
templates/              # Project templates for `ipb new`
```

## Key Architectural Patterns

### Error Handling

- **Custom Error Class**: `CliError` extends `Error` with error codes
- **Centralized Handler**: `handleCliError()` in `utils.ts` provides consistent error formatting
- **Exit Codes**: `ExitCode` enum for different error types (validation, auth, file, API, etc.)
- **Error Context**: `withCommandContext()` wrapper attaches command names to errors
- **Actionable Messages**: Errors include suggestions for fixing common issues

```typescript
// Example error usage
throw new CliError(ERROR_CODES.MISSING_CARD_KEY, 'Card key is required');
```

### Command Structure

Commands follow a consistent pattern:

1. Validate inputs using utility functions
2. Initialize API clients (with retry/rate limit handling)
3. Show progress indicators (spinners) when appropriate
4. Format output (table, JSON, YAML) based on options
5. Handle errors with context

```typescript
// Example command structure
export async function accountsCommand(options: CommonOptions) {
  const api = await initializePbApi(credentials, options);
  const verbose = getVerboseMode(options.verbose);
  const result = await withRetry(() => api.getAccounts(), { verbose });
  formatOutput(result.data, options);
}
```

### Utility Functions

Key utilities in `src/utils.ts`:

- **Credential Management**: Secure file operations with atomic writes
- **Profile Management**: Multiple credential profiles support
- **Terminal Capabilities**: Unicode/emoji detection and ASCII fallbacks
- **Output Formatting**: Table, JSON, YAML with automatic formatting
- **Rate Limiting**: Automatic retry with exponential backoff
- **Progress Indicators**: File size-aware spinners
- **Secret Detection**: Warnings for insecure secret usage
- **Command History**: Logging of executed commands

### Configuration Management

- **Credentials**: Stored in `~/.ipb/.credentials.json` with restricted permissions (600)
- **Profiles**: Multiple profiles in `~/.ipb/profiles/<name>.json`
- **Active Profile**: Tracked in `~/.ipb/active-profile.json`
- **Priority Order**: Command args → Profile → Environment vars → Credentials file
- **Security**: Warns when secrets are loaded from environment variables

### Testing

- **Framework**: Vitest with ESM support
- **Mocking**: `vi.mock()` for modules, `vi.hoisted()` for shared mocks
- **Test Structure**: Commands tested in `test/cmds/*.test.ts`
- **Mocks**: Located in `test/__mocks__/` for external dependencies
- **Coverage**: Configured in `vitest.config.ts`

## Coding Standards

### TypeScript

- **Strict Mode**: Enabled with `noUncheckedIndexedAccess` and `noImplicitOverride`
- **Module System**: ESM only (`"type": "module"`)
- **Target**: ES2022
- **Imports**: Use `.js` extension for ESM imports (TypeScript requirement)

### Linting & Formatting

- **Tool**: Biome (replaces ESLint/Prettier)
- **Configuration**: `biome.json`
- **Rules**:
  - `noExplicitAny`: Error (use `biome-ignore` comments when necessary)
  - `noUnusedVariables`: Error
  - Recommended rules enabled
- **Auto-fix**: Run `npm run lint:fix` to auto-fix issues

### Code Style

- **Quotes**: Single quotes
- **Semicolons**: Always
- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Trailing Commas**: ES5 style
- **Arrow Functions**: Always parentheses

### Import Organization

- Biome automatically organizes imports when running `lint:fix`
- Grouping: External packages → Node.js built-ins → Internal/relative → Type imports
- Alphabetical within each group

## Best Practices

### Error Handling Best Practices

1. Use `CliError` with error codes from `ERROR_CODES` for user-facing errors
2. Wrap command handlers with `withCommandContext()` to attach command names
3. Use `handleCliError()` in catch blocks for consistent error formatting
4. Provide actionable error messages with suggestions

### API Calls

1. Always use `withRetry()` wrapper for API calls (handles rate limiting)
2. Use `initializeApi()` or `initializePbApi()` for API clients
3. Check rate limits and show warnings in verbose mode
4. Use `getVerboseMode()` instead of direct `options.verbose` checks

### Output Formatting

1. Use `formatOutput()` for structured data (handles JSON/YAML/table)
2. Use `getSafeText()` for text with emojis (respects terminal capabilities)
3. Use `createSpinner()` for progress indicators (automatically handles pipe mode)
4. Check `isStdoutPiped()` before showing interactive elements

### Security

1. Store secrets in credential files, not environment variables
2. Use `writeFileAtomic()` for credential writes (atomic operations)
3. Validate inputs using `validateAmount()`, `validateAccountId()`, etc.
4. Warn about secret usage in non-interactive environments

### Testing Best Practices

1. Mock external dependencies in `vi.mock()` blocks
2. Use `vi.hoisted()` for shared mocks
3. Test error paths with `expect().toThrow(CliError)`
4. Mock terminal capabilities for consistent test output

## Environment Variables

The CLI respects standard environment variables:

- `NO_COLOR`: Disable colored output
- `FORCE_COLOR`: Force colored output
- `DEBUG`: Enable verbose/debug mode
- `PAGER`: Pager for long output
- `LINES`/`COLUMNS`: Terminal dimensions
- `TMPDIR`: Temporary directory
- `EDITOR`: Editor for config files
- `TERM`: Terminal type for capability detection

## Development Workflow

1. **Build**: `npm run build` - Compiles TypeScript to `bin/`
2. **Test**: `npm test` - Runs Vitest in watch mode
3. **Test (CI)**: `npm run test:run` - Runs tests once
4. **Lint**: `npm run lint` - Checks code quality
5. **Lint Fix**: `npm run lint:fix` - Auto-fixes issues
6. **Format**: `npm run format` - Formats code
7. **Type Check**: `npm run type-check` - TypeScript validation
8. **CI**: `npm run ci` - Full CI pipeline

## Adding New Commands

1. Create command file in `src/cmds/`
2. Export command function from `src/cmds/index.ts`
3. Register command in `src/index.ts` with options
4. Add tests in `test/cmds/`
5. Follow existing command patterns for consistency
6. Use `CommonOptions` interface for shared options
7. Add command to shell completion scripts if needed

## Common Patterns

### Command with API Call

```typescript
export async function myCommand(options: CommonOptions) {
  const api = await initializePbApi(credentials, options);
  const verbose = getVerboseMode(options.verbose);
  const result = await withRetry(() => api.someMethod(), { verbose });
  formatOutput(result.data, options);
}
```

### Command with File Operations

```typescript
export async function myCommand(options: Options) {
  const normalizedPath = await validateFilePath(options.filename, ['.js']);
  const fileSize = await getFileSize(normalizedPath);
  const spinner = createSpinner(true, getSafeText(`📖 Reading ${formatFileSize(fileSize)}...`));
  // ... file operations
}
```

### Destructive Operation with Confirmation

```typescript
const confirmed = await confirmDestructiveOperation(
  'This will delete data. Continue?',
  { yes: options.yes }
);
if (!confirmed) return;
```

## Notes

- The project follows [clig.dev](https://clig.dev/) guidelines for CLI best practices
- All improvements from clig.dev have been implemented
- Command history is logged to `~/.ipb/history.json` (unless `--no-history` is set)
- Update notifications are checked periodically (24-hour cache)
- Shell completion scripts are generated for bash and zsh
