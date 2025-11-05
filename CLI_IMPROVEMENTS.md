# CLI Best Practices Improvement Suggestions

Based on the [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) repository, here are actionable improvements for the Investec Programmable Banking CLI.

---

## ✅ Already Implemented (Good Practices)

1. **Error Handling** - Centralized error handling with `handleCliError` ✅
2. **Error Codes** - Standardized error codes (E4002, E4003, etc.) ✅
3. **Progress Indicators** - Using `ora` spinner for long-running operations ✅
4. **Interactive Prompts** - Using `@inquirer/prompts` for missing arguments ✅
5. **Type Safety** - TypeScript with proper type definitions ✅
6. **Command Context** - Error context attached via `withCommandContext` ✅
7. **Help Text** - Commander.js provides help automatically ✅
8. **Version Management** - Version checking implemented ✅
9. **Testing** - Comprehensive test suite with Vitest ✅
10. **Security** - Credential file permissions set to 0o600 ✅

---

## 🔴 High Priority Improvements

### 1. Enhanced Input Validation

**Current State**: ✅ Fully Implemented

**Implementation**:
- Added `INVALID_INPUT` error code (`E4013`) to `errors.ts`
- Created `validateAmount()` function in `utils.ts`:
  - Validates amount is a valid, finite number
  - Checks amount is positive
  - Validates decimal precision (default max 2 decimal places)
  - Provides clear error messages for each validation failure
- Created `validateAccountId()` function in `utils.ts`:
  - Validates account ID is not empty
  - Checks minimum length (3 characters)
  - Checks maximum length (100 characters)
  - Prevents path traversal attempts and invalid characters (`..`, `/`, `\`)
- File path validation already implemented:
  - `validateFilePath()` and `validateFilePathForWrite()` functions exist
  - Used in all file-based commands (deploy, fetch, upload, publish, etc.)
  - Validates file extensions, permissions, and normalizes paths
  - Includes path traversal protection
- Updated commands:
  - `transfer.ts`: Added `validateAmount()` and `validateAccountId()` for both account IDs
  - `pay.ts`: Added `validateAmount()` and `validateAccountId()` for account ID
  - `balances.ts`: Added `validateAccountId()` validation
  - `transactions.ts`: Added `validateAccountId()` validation
- Error handler updated to recognize `INVALID_INPUT` errors and return `VALIDATION_ERROR` exit code

**Validation Features**:
- Amount validation: Checks for NaN, infinity, positive values, and decimal precision (default 2 decimal places)
- Account ID validation: Length checks, character validation, path traversal protection
- File path validation: Extension validation, permission checks, path normalization, path traversal protection

**Files Updated**:
- `src/errors.ts` - Added `INVALID_INPUT` error code
- `src/utils.ts` - Added `validateAmount()` and `validateAccountId()` functions, updated `determineExitCode()` to recognize `INVALID_INPUT`
- `src/cmds/transfer.ts` - Added amount and account ID validation
- `src/cmds/pay.ts` - Added amount and account ID validation
- `src/cmds/balances.ts` - Added account ID validation
- `src/cmds/transactions.ts` - Added account ID validation

**Note**: Currency and country code validation can be added in the future if needed. File path validation was already fully implemented in previous improvements.

---

### 2. Improved Command Descriptions

**Current State**: ✅ Fully Implemented

**Implementation**:
- Enhanced all 30 command descriptions to be more action-oriented and informative
- Descriptions now start with imperative verbs (List, Get, Deploy, Upload, etc.)
- Added context about what each command does and when to use it
- Improved clarity by explaining the purpose and outcome of each command
- All commands already have examples in their help text (via `addHelpText('after', ...)`)
- Descriptions follow CLI best practices:
  - Start with action verb (imperative mood)
  - Explain what the command does
  - Provide context about when/why to use it
  - Include key details about behavior (e.g., "requires confirmation", "prompts interactively")

**Examples of improvements**:
- `cards`: "List all programmable cards. Shows card keys, numbers, and activation status for each card."
- `deploy`: "Deploy JavaScript code to a programmable card. Uploads code and optional environment variables, then publishes it to make it active."
- `run`: "Run card code locally using the emulator. Test JavaScript code with simulated transactions without deploying to a card."
- `config`: "Configure authentication credentials. Set API keys, client credentials, and card keys for CLI operations."

**Files Updated**:
- `src/index.ts` - Enhanced all command descriptions with more detailed, action-oriented descriptions

---

### 3. Structured Output Options - **✅ Fully Implemented**

**Current State**: ✅ All commands now support `--json` and `--output` flags consistently.

**Implementation**:
- ✅ Created unified `formatOutput` utility function in `src/utils.ts`
- ✅ Added `--json` and `--output` options to shared credential options
- ✅ Updated all data-returning commands to use `formatOutput`
- ✅ Commands now support both JSON output and file writing

**Files Updated**:
- ✅ `src/utils.ts` - Added `formatOutput` utility function
- ✅ `src/cmds/types.ts` - Added `output?: string` to `CommonOptions`
- ✅ `src/index.ts` - Added `--json` and `--output` to shared options
- ✅ `src/cmds/cards.ts` - Uses `formatOutput`
- ✅ `src/cmds/currencies.ts` - Uses `formatOutput`
- ✅ `src/cmds/countries.ts` - Uses `formatOutput`
- ✅ `src/cmds/merchants.ts` - Uses `formatOutput`
- ✅ `src/cmds/beneficiaries.ts` - Uses `formatOutput`
- ✅ `src/cmds/accounts.ts` - Uses `formatOutput`
- ✅ `src/cmds/transactions.ts` - Uses `formatOutput`
- ✅ `src/cmds/balances.ts` - Uses `formatOutput`

---

### 4. Enhanced Error Messages - **✅ Fully Implemented**

**Current State**: ✅ Error messages now include actionable suggestions based on error type.

**Implementation**:
- ✅ Enhanced `handleCliError` function with intelligent suggestion system
- ✅ Detects error types from both `CliError` codes and error message patterns
- ✅ Provides context-specific tips for common error scenarios
- ✅ Suggestions displayed in yellow color for visibility

**Error Types with Suggestions**:
- ✅ **File Not Found**: Tips for checking file paths
- ✅ **Card Key Errors**: Suggests using `ipb cards` command
- ✅ **Credential/Authentication Errors**: Suggests `ipb config` or checking API keys
- ✅ **Missing Env File**: Tips for creating environment files
- ✅ **Missing Account ID**: Suggests using `ipb accounts` command
- ✅ **Template Errors**: Tips for checking template names
- ✅ **Project Exists**: Suggestions for handling existing projects
- ✅ **Network Errors**: Tips for checking connectivity
- ✅ **Permission Errors**: Suggestions for file permissions

**Files Updated**:
- ✅ `src/utils.ts` - Enhanced `handleCliError` with comprehensive suggestion system

---

### 5. Command Aliases for Common Operations

**Current State**: ✅ Fully Implemented

**Implementation**:
- Added aliases for 11 commonly used commands:
  - `accounts` → `acc`
  - `balances` → `bal`
  - `cards` → `c`
  - `config` → `cfg`
  - `deploy` → `d`
  - `fetch` → `f`
  - `logs` → `log`
  - `publish` → `pub`
  - `run` → `r`
  - `transactions` → `tx`
  - `upload` → `up`
- Aliases are displayed in help text (e.g., `cards|c [options]`)
- Updated shell completion script generation to include all aliases
- Completion scripts now support tab completion for both full command names and aliases
- Aliases work identically to their full command counterparts

**Files Updated**:
- `src/index.ts` - Added `.alias()` calls to 11 frequently used commands, updated completion script generation to include aliases

---

## 🟡 Medium Priority Improvements

### 6. Better Help Text Organization

**Current State**: ✅ Fully Implemented

**Implementation**:
- Added command category organization to help output
- Commands are grouped into 10 logical categories:
  - Card Management (cards, enable, disable)
  - Code Management (deploy, fetch, upload, publish, published, logs, run, simulate)
  - Environment Management (env, env-list, upload-env)
  - Account Management (accounts, balances, transactions, beneficiaries)
  - Payments (transfer, pay)
  - Configuration (config)
  - AI & Code Generation (ai, bank, new)
  - Authentication (login, register)
  - Reference Data (currencies, countries, merchants)
  - Utilities (completion)
- Category reference added to main help output using `addHelpText('afterAll', ...)`
- All commands already have examples in their help text (via `addHelpText('after', ...)`)
- Commands are organized in code with category comments for maintainability

**Files Updated**:
- `src/index.ts` - Added category organization comments and help text with command categories

---

### 7. Configuration File Validation - **✅ Fully Implemented**

**Current State**: ✅ Credentials are now validated before API initialization.

**Implementation**:
- ✅ Created `validateCredentialsFile` function in `src/utils.ts`
- ✅ Validates required fields: `clientId`, `clientSecret`, `apiKey`
- ✅ Integrated into `initializeApi` and `initializePbApi` functions
- ✅ Provides actionable error message with suggestion to run `ipb config`
- ✅ Supports custom required fields for different validation scenarios

**Files Updated**:
- ✅ `src/utils.ts` - Added `validateCredentialsFile` function and integrated into API initialization

---

### 8. Progress Indicators for File Operations

**Status**: ✅ Fully Implemented

**Implementation Details**:
- Added `formatFileSize()` utility function to format file sizes in human-readable format (B, KB, MB, GB)
- Added `getFileSize()` utility function to get file size in bytes
- Enhanced all file read operations to show progress with file size:
  - `deployCommand` - Shows file size when reading env and code files
  - `uploadCommand` - Shows file size when reading code file
  - `publishCommand` - Shows file size when reading code file
  - `runCommand` - Shows file size when reading env and code files
- Enhanced all file write operations to show progress with file size:
  - `fetchCommand` - Shows file size when saving code to file
  - `logsCommand` - Shows file size when saving logs to file
  - `aiCommand` - Shows file size when saving generated code and env files
- Progress indicators display:
  - File path and size during read operations (e.g., "📖 reading code from file.js (2.5 KB)...")
  - File path and size during write operations (e.g., "💾 saving to file: output.js (2.5 KB)...")
  - Final file size after operations complete (e.g., "🎉 code saved to file (2.5 KB)")
- Spinners update dynamically to show progress through different stages (read → process → write/upload)
- File sizes are calculated using `Buffer.byteLength()` for accurate size representation
- All file operations now provide clear visual feedback about the amount of data being processed

**Files Updated**:
- ✅ `src/utils.ts` - Added `formatFileSize()` and `getFileSize()` utility functions
- ✅ `src/cmds/fetch.ts` - Added progress indicators for file write operation
- ✅ `src/cmds/logs.ts` - Added progress indicators for file write operation
- ✅ `src/cmds/deploy.ts` - Added progress indicators for env and code file read operations
- ✅ `src/cmds/upload.ts` - Added progress indicators for code file read operation
- ✅ `src/cmds/publish.ts` - Added progress indicators for code file read operation
- ✅ `src/cmds/ai.ts` - Added progress indicators for code and env file write operations
- ✅ `src/cmds/run.ts` - Added progress indicators for env and code file read operations

---

### 9. Command Exit Codes

**Current State**: ✅ Fully Implemented

**Implementation**:
- Added `ExitCode` enum with 8 exit codes (0-7) following Unix conventions
- `determineExitCode()` function maps error types to appropriate exit codes
- Updated `handleCliError()` to use specific exit codes based on error type
- Exit codes are documented in README with examples and usage in scripts

**Exit Codes**:
- `0` - Success
- `1` - General Error
- `2` - Validation Error (invalid input, missing required fields)
- `3` - Authentication Error (invalid credentials, auth failures)
- `4` - File Error (file not found, file system errors)
- `5` - API Error (API request failures, server errors)
- `6` - Network Error (connection issues, timeouts)
- `7` - Permission Error (file permission errors)

**Files Updated**:
- `src/errors.ts` - Added `ExitCode` enum
- `src/utils.ts` - Added `determineExitCode()` function and updated `handleCliError()` to use specific exit codes
- `src/index.ts` - Updated completion command error handling to use appropriate exit codes
- `README.md` - Added "Exit Codes" section with reference table, examples, and script usage patterns

---

### 10. Interactive Confirmation for Destructive Operations

**Current State**: ✅ Fully Implemented

**Implementation**:
- Created `confirmDestructiveOperation()` utility function in `utils.ts`:
  - Uses `@inquirer/prompts` `confirm` for interactive prompts
  - Automatically skips confirmation when `--yes` flag is set
  - Automatically skips confirmation in non-interactive mode (piped output)
  - Defaults to `false` (requires explicit confirmation)
  - Handles user cancellation gracefully
- Added confirmation to 5 destructive operations:
  - `pay`: Payment confirmation (replaced custom "CONFIRM" input with standard confirmation)
  - `transfer`: Transfer confirmation with summary display
  - `deploy`: Deployment confirmation (warns about overwriting existing code)
  - `publish`: Publishing confirmation (warns about activating code)
  - `disable`: Disable confirmation (warns about deactivating code)
- Added `--yes` flag to all destructive commands:
  - `pay`, `transfer`, `deploy`, `publish`, `disable`
  - Allows skipping confirmation in CI/CD pipelines
  - Updated help text examples to show `--yes` usage
- Enhanced confirmation messages:
  - Show operation summary (account IDs, amounts, card keys, etc.)
  - Clear, descriptive confirmation prompts
  - Context-specific messages for each operation type
- Updated `CommonOptions` interface to include `yes?: boolean` option
- Updated completion script generation to include `--yes` flag for destructive commands

**Features**:
- Interactive confirmation prompts for destructive operations
- `--yes` flag to skip confirmation (useful for automation)
- Non-interactive mode detection (requires `--yes` when piped)
- Clear, context-specific confirmation messages
- Graceful handling of cancellation

**Files Updated**:
- `src/utils.ts` - Added `confirmDestructiveOperation()` utility function
- `src/cmds/types.ts` - Added `yes?: boolean` to `CommonOptions` interface
- `src/cmds/pay.ts` - Replaced custom confirmation with `confirmDestructiveOperation()`
- `src/cmds/transfer.ts` - Added confirmation with summary display
- `src/cmds/deploy.ts` - Added confirmation before deployment
- `src/cmds/publish.ts` - Added confirmation before publishing
- `src/cmds/disable.ts` - Added confirmation before disabling
- `src/index.ts` - Added `--yes` option to destructive commands, updated help text and completion scripts

---

## 🟢 Low Priority Improvements

### 11. Command History/Logging

**Current State**: ✅ Fully Implemented

**Implementation**:
- Commands are logged to `~/.ipb/history.json` with timestamp, command name, arguments, options, exit code, and duration
- Sensitive data (API keys, credentials, tokens) is automatically sanitized/redacted
- History is limited to the last 1000 entries to prevent file bloat
- Can be disabled with `--no-history` global flag
- Both successful and failed commands are logged
- Useful for debugging, audit trails, and tracking command usage

**Files Updated**:
- `src/utils.ts` - Added `getHistoryFilePath()`, `readCommandHistory()`, `writeCommandHistory()`, `sanitizeOptions()`, `sanitizeArgs()`, `logCommandHistory()` functions
- `src/index.ts` - Added `--no-history` global option, integrated history logging into command execution flow with `preAction` hook

---

### 12. Autocomplete Support

**Current State**: ✅ Fully Implemented

**Implementation**:
- Added `completion` command that generates shell completion scripts for bash and zsh
- Supports all 30 commands with their specific options
- Intelligent file completion for `--filename` (JavaScript files), `--output` (any file), `--env` (.env.* files)
- Template completion for `--template` option (default, petro)
- Global options available for all commands
- Command-specific options properly scoped

**Usage**:
```bash
# Bash
ipb completion bash > /etc/bash_completion.d/ipb
source <(ipb completion bash)  # For current session

# Zsh
ipb completion zsh > ~/.zsh/completions/_ipb
# Then add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)
```

**Files Updated**:
- `src/index.ts` - Added `completion` command and `generateCompletionScript()`, `generateBashCompletion()`, `generateZshCompletion()` functions

---

### 13. Version Update Notification - **✅ Fully Implemented**

**Current State**: ✅ Version checking is now active with rate limiting and update notifications.

**Implementation**:
- ✅ Enhanced `checkLatestVersion` to handle errors silently
- ✅ Added `checkForUpdates` function with 24-hour cache/rate limiting
- ✅ Added `showUpdateNotification` to display update messages
- ✅ Added `getLastUpdateCheck` and `setLastUpdateCheck` for cache management
- ✅ Added `--check-updates` global flag to force update check
- ✅ Integrated update checking into main CLI entry point
- ✅ Background update checks (non-blocking) for regular commands
- ✅ Cache stored in `~/.ipb/update-check.json`

**Features**:
- **Rate Limiting**: Updates are checked at most once per 24 hours
- **Cache Management**: Last check timestamp stored in `~/.ipb/update-check.json`
- **Background Checks**: Non-blocking update checks for regular commands
- **Force Check**: `--check-updates` flag forces immediate check
- **User-Friendly Messages**: Clear notifications with update instructions

**Usage**:
```bash
# Automatic background check (cached for 24 hours)
ipb cards

# Force check for updates
ipb --check-updates

# Check on startup (when no command provided)
ipb
```

**Files Updated**:
- ✅ `src/utils.ts` - Added update checking functions with caching
- ✅ `src/index.ts` - Integrated update checking into main function

---

### 14. Better Table Formatting - **✅ Fully Implemented**

**Current State**: ✅ Tables now use `cli-table3` for professional formatting.

**Implementation**:
- ✅ Integrated `cli-table3` library for better table formatting
- ✅ Added intelligent column alignment (left/right/center based on data type)
- ✅ Support for nested data (objects converted to JSON with truncation)
- ✅ Better handling of long values (truncation with ellipsis)
- ✅ Automatic column width calculation based on terminal size
- ✅ Word wrapping for long text
- ✅ Fallback to basic formatting if library unavailable

**Features**:
- **Smart Alignment**: Numeric columns (amount, balance, id, etc.) are right-aligned
- **Nested Data**: Objects are serialized to JSON and truncated if too long
- **Long Values**: Values exceeding column width are truncated with "..."
- **Adaptive Width**: Column widths adjust based on terminal size
- **Professional Borders**: Clean table borders using cli-table3 styling

**Files Updated**:
- ✅ `package.json` - Added cli-table3 dependency
- ✅ `src/utils.ts` - Enhanced `printTable` function with cli-table3 support

---

### 15. Command Documentation Generation

**Current State**: README is manually maintained.

**Recommendations**:
- Auto-generate command documentation from Commander.js definitions
- Keep README in sync with actual commands
- Generate markdown from command help

---

### 16. Environment Variable Documentation - **✅ Fully Implemented**

**Current State**: ✅ Environment variables are now fully documented with a dedicated command.

**Implementation**:
- ✅ Created `ipb env-list` command to display all supported environment variables
- ✅ Documents each variable's purpose, format, required status, and default values
- ✅ Groups variables by category (API Credentials, AI Generation, Development, Security)
- ✅ Provides usage examples and priority order explanation
- ✅ Supports JSON and YAML output formats
- ✅ Updated README with environment variable documentation section

**Files Updated**:
- ✅ `src/cmds/env-list.ts` - New command to list environment variables
- ✅ `src/cmds/index.ts` - Added export for envListCommand
- ✅ `src/index.ts` - Added env-list command to CLI
- ✅ `README.md` - Added environment variables documentation section

---

### 17. Command Chaining/Piping - **✅ Fully Implemented**

**Current State**: ✅ Commands now support piping and command chaining.

**Implementation**:
- ✅ Added `isStdoutPiped()` to detect when output is piped
- ✅ Added `isStdinPiped()` to detect when input is piped
- ✅ Added `readStdin()` to read data from stdin
- ✅ Updated `formatOutput` to automatically output JSON when piped
- ✅ Updated all data-returning commands to support pipe mode
- ✅ Commands suppress human-friendly messages when piped
- ✅ Commands disable spinners when piped

**Features**:
- **Auto JSON Output**: When stdout is piped, commands automatically output JSON
- **Stdin Support**: Commands like `balances` and `transactions` can read account IDs from stdin
- **Pipe-Friendly**: No spinners, no title boxes, no extra messages when piped
- **Command Chaining**: Support for workflows like `ipb accounts | ipb balances`

**Usage Examples**:
```bash
# Get accounts and pipe to balances
ipb accounts | jq '.[0].accountId' | xargs ipb balances

# Get accounts as JSON and filter
ipb accounts | jq '.[] | select(.productName == "Private")'

# Chain commands
ipb accounts --json | ipb balances  # balances will read accountId from stdin
```

**Commands Updated**:
- ✅ `accounts.ts` - Supports piping, outputs JSON when piped
- ✅ `balances.ts` - Supports piping, reads accountId from stdin if available
- ✅ `transactions.ts` - Supports piping, reads accountId from stdin if available
- ✅ `cards.ts` - Supports piping, outputs JSON when piped
- ✅ `beneficiaries.ts` - Supports piping, outputs JSON when piped
- ✅ `merchants.ts` - Supports piping, outputs JSON when piped
- ✅ `currencies.ts` - Supports piping, outputs JSON when piped
- ✅ `countries.ts` - Supports piping, outputs JSON when piped

**Files Updated**:
- ✅ `src/utils.ts` - Added pipe detection utilities and updated formatOutput
- ✅ All data-returning command files - Updated to support pipe mode

---

### 18. Better File Path Handling - **✅ Fully Implemented**

**Current State**: ✅ File paths are now normalized, validated, and checked for permissions.

**Implementation**:
- ✅ Created `normalizeFilePath` function to expand `~` and resolve relative paths
- ✅ Added `validateFileExtension` to check file extensions
- ✅ Added `checkFilePermissions` to verify read/write permissions
- ✅ Created `validateFilePath` and `validateFilePathForWrite` convenience functions
- ✅ Updated all file-handling commands to use new path utilities
- ✅ Better error messages for path issues (missing files, permissions, invalid extensions)

**Features**:
- **Path Normalization**: Expands `~/` to home directory, resolves relative paths
- **Extension Validation**: Validates file extensions (e.g., `.js` for code files, `.json` for data files)
- **Permission Checking**: Verifies read/write permissions before operations
- **Better Errors**: Clear error messages for missing files, permission issues, and invalid extensions

**Commands Updated**:
- ✅ `deploy.ts` - Validates `.js` files and `.env.*` files
- ✅ `upload.ts` - Validates `.js` files
- ✅ `publish.ts` - Validates `.js` files
- ✅ `run.ts` - Validates `.js` files and `.env.*` files
- ✅ `simulate.ts` - Validates `.js` files
- ✅ `fetch.ts` - Validates write paths for `.js` files
- ✅ `logs.ts` - Validates write paths for `.json` files
- ✅ `env.ts` - Validates write paths for `.json` files
- ✅ `upload-env.ts` - Validates `.json` files
- ✅ `published.ts` - Validates write paths for `.js` files
- ✅ `ai.ts` - Validates write paths for generated files

**Files Updated**:
- ✅ `src/utils.ts` - Added path validation utilities
- ✅ All command files using file operations - Updated to use new utilities

---

### 19. Rate Limiting Indicators

**Status**: ✅ Fully Implemented

**Implementation Details**:
- Added `RATE_LIMIT_EXCEEDED` error code (`E4014`) to `src/errors.ts`
- Created `RateLimitInfo` interface and `detectRateLimit()` function to extract rate limit information from errors (429 status codes, headers, error messages)
- Created `formatRateLimitInfo()` function to format rate limit information for display
- Implemented `withRetry()` utility function with exponential backoff and jitter for automatic retry on rate limit errors
- Enhanced error handler (`handleCliError`) to detect rate limit errors and provide actionable suggestions
- Added rate limit information display in verbose mode when errors occur
- Integrated retry logic with rate limit handling into all major API commands:
  - `cardsCommand` - `api.getCards()`
  - `accountsCommand` - `api.getAccounts()`
  - `balancesCommand` - `api.getAccountBalances()`
  - `transactionsCommand` - `api.getAccountTransactions()`
  - `transferCommand` - `api.transferMultiple()`
  - `payCommand` - `api.payMultiple()`
  - `deployCommand` - `api.uploadEnv()`, `api.uploadCode()`, `api.uploadPublishedCode()`
- Retry logic automatically detects 429 status codes, rate limit headers (`X-RateLimit-*`, `Retry-After`), and rate limit keywords in error messages
- Exponential backoff with jitter prevents thundering herd problems
- Configurable max retries (default: 3), base delay (default: 1000ms), and max delay (default: 60000ms)
- Verbose mode shows retry attempts and rate limit information

**Files Updated**:
- ✅ `src/errors.ts` - Added `RATE_LIMIT_EXCEEDED` error code
- ✅ `src/utils.ts` - Added rate limit detection, formatting, and retry logic utilities
- ✅ `src/cmds/cards.ts` - Wrapped `api.getCards()` with retry logic
- ✅ `src/cmds/accounts.ts` - Wrapped `api.getAccounts()` with retry logic
- ✅ `src/cmds/balances.ts` - Wrapped `api.getAccountBalances()` with retry logic
- ✅ `src/cmds/transactions.ts` - Wrapped `api.getAccountTransactions()` with retry logic
- ✅ `src/cmds/transfer.ts` - Wrapped `api.transferMultiple()` with retry logic
- ✅ `src/cmds/pay.ts` - Wrapped `api.payMultiple()` with retry logic
- ✅ `src/cmds/deploy.ts` - Wrapped `api.uploadEnv()`, `api.uploadCode()`, and `api.uploadPublishedCode()` with retry logic

---

### 20. Configuration Profiles

**Current State**: ✅ Fully Implemented

**Implementation**:
- Created profile management system in `utils.ts`:
  - `getProfilesDirectory()`: Returns `~/.ipb/profiles/` directory path
  - `getProfilePath(profileName)`: Returns path to a specific profile file
  - `listProfiles()`: Lists all available profiles
  - `readProfile(profileName)`: Reads a profile file
  - `writeProfile(profileName, data)`: Writes/updates a profile file
  - `deleteProfile(profileName)`: Deletes a profile file
  - `getActiveProfile()`: Gets the currently active profile name
  - `setActiveProfile(profileName)`: Sets the active profile (used when `--profile` is not specified)
  - `loadProfile(credentials, profileName)`: Loads credentials from a profile
- Updated `config` command to support profiles:
  - `ipb config --profile <name> --client-id <id> --client-secret <secret> --api-key <key>`: Save credentials to a profile
  - `ipb config profile list`: List all profiles (shows active profile)
  - `ipb config profile set <name>`: Set the active profile
  - `ipb config profile show`: Show the currently active profile
  - `ipb config profile delete <name>`: Delete a profile
- Added `--profile <name>` option to all commands via `addApiCredentialOptions()`:
  - Allows using a specific profile for any command (e.g., `ipb deploy --profile production`)
  - Profile takes precedence over default credentials
  - Command-line options override profile values
- Updated `optionCredentials()` to:
  - Check for `--profile` option first
  - Fall back to active profile if no `--profile` specified
  - Fall back to credentials file if no active profile
  - Command-line options always override profile/credentials file values
- Profile storage:
  - Profiles stored in `~/.ipb/profiles/<name>.json`
  - Active profile stored in `~/.ipb/active-profile.json`
  - All profile files use secure permissions (0o600)
  - Profiles can contain: `clientId`, `clientSecret`, `apiKey`, `cardKey`, `openaiKey`, `sandboxKey`, `host`

**Features**:
- Multiple credential profiles for different environments (production, staging, development, etc.)
- Active profile system (default profile used when `--profile` not specified)
- Profile management commands (list, set, show, delete)
- Easy switching between environments
- Command-line option overrides for flexibility

**Usage Examples**:
```sh
# Create profiles
ipb config --profile production --client-id <id> --client-secret <secret> --api-key <key>
ipb config --profile staging --client-id <id> --client-secret <secret> --api-key <key>

# Use profiles
ipb deploy --profile production -f main.js -c card-123
ipb cards --profile staging

# Manage profiles
ipb config profile list
ipb config profile set production
ipb config profile show
ipb config profile delete staging
```

**Files Updated**:
- `src/utils.ts` - Added profile management functions
- `src/cmds/types.ts` - Added `profile?: string` to `CommonOptions`
- `src/cmds/set.ts` - Updated `configCommand` to support profile creation/management
- `src/index.ts` - Added `--profile` option, profile subcommands, updated `optionCredentials()` to load profiles

---

## 📋 Implementation Checklist

### Phase 1: Critical Improvements (Week 1)
- [x] Enhanced input validation utilities ✅ (Item 1)
- [x] Improved command descriptions with examples ✅ (Item 2)
- [x] Enhanced error messages with suggestions ✅ (Item 4)
- [x] Add confirmation for destructive operations ✅ (Item 10)

### Phase 2: User Experience (Week 2)
- [x] Consistent JSON output across all commands ✅ (Item 3)
- [x] Command aliases for common operations ✅ (Item 5)
- [x] Better help text organization ✅ (Item 6)
- [x] Configuration file validation ✅ (Item 7)

### Phase 3: Advanced Features (Week 3)
- [x] Shell autocomplete support ✅ (Item 12)
- [x] Version update notifications ✅ (Item 13)
- [x] Better table formatting ✅ (Item 14)
- [ ] Command documentation generation
- [x] Rate limiting indicators with retry logic ✅ (Item 19)

---

## 📚 References

- [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Inquirer.js Documentation](https://github.com/SBoudrias/Inquirer.js)
- [Chalk Documentation](https://github.com/chalk/chalk)

---

## 🎯 Priority Summary

**High Priority** (Do first):
1. Input validation consistency
2. Enhanced error messages
3. Command descriptions with examples
4. Destructive operation confirmations

**Medium Priority** (Do next):
5. Structured output options
6. Command aliases
7. Help text organization
8. Configuration validation

**Low Priority** (Nice to have):
9. Autocomplete support
10. Version update notifications
11. Command history
12. Better table formatting

