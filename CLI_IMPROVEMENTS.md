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

**Current State**: Some commands validate input (e.g., `transfer`, `pay`), but validation is inconsistent.

**Issues**:
- Amount validation only checks `> 0`, doesn't validate decimal precision
- Account IDs not validated for format
- File paths not validated before use
- Missing validation for currency codes, country codes

**Recommendations**:
```typescript
// Add to src/errors.ts
export const ERROR_CODES = {
  // ... existing codes ...
  INVALID_INPUT: 'E4013', // Add for invalid input validation
};

// Create validation utilities in src/utils.ts
export function validateAmount(amount: number, maxDecimals = 2): void {
  if (amount <= 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Amount must be positive');
  }
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > maxDecimals) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, `Amount can have at most ${maxDecimals} decimal places`);
  }
}

export function validateAccountId(accountId: string): void {
  if (!accountId || accountId.trim().length === 0) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Account ID is required');
  }
  // Add format validation if Investec has a specific format
}

export function validateFilePath(filePath: string): void {
  if (!filePath || !filePath.trim()) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'File path is required');
  }
  // Check for path traversal attempts
  if (filePath.includes('..')) {
    throw new CliError(ERROR_CODES.INVALID_INPUT, 'Invalid file path');
  }
}
```

**Files to Update**:
- `src/cmds/transfer.ts` - Add amount validation
- `src/cmds/pay.ts` - Add amount validation
- `src/cmds/balances.ts` - Validate account ID format
- `src/cmds/transactions.ts` - Validate account ID format
- All file-based commands - Validate file paths

---

### 2. Improved Command Descriptions

**Current State**: Some command descriptions are too brief (e.g., "deploy code to card").

**Recommendations**:
```typescript
// Better descriptions with examples
program
  .command('deploy')
  .description('Deploy code to a programmable card. Uploads code and environment variables, then publishes it.')
  .addHelpText('after', `
Examples:
  $ ipb deploy -f main.js -e production -c card-123
  $ ipb deploy -f main.js --env dev --card-key card-456
  `)
  .option('-f,--filename <filename>', 'JavaScript file to deploy')
  .option('-e,--env <env>', 'Environment name (uses .env.<env> file)')
  .option('-c,--card-key <cardKey>', 'Card identifier');
```

**Files to Update**:
- `src/index.ts` - Enhance all command descriptions
- Add examples to help text for complex commands

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

**Current State**: No aliases defined for commands.

**Recommendations**:
```typescript
// Add aliases for common commands
program
  .command('deploy')
  .alias('d')  // Short alias
  .description('Deploy code to card');

program
  .command('fetch')
  .alias('f')
  .description('Fetch saved code from card');

program
  .command('accounts')
  .alias('acc')
  .description('List accounts');
```

**Files to Update**:
- `src/index.ts` - Add aliases to frequently used commands

---

## 🟡 Medium Priority Improvements

### 6. Better Help Text Organization

**Current State**: Help text is functional but could be better organized.

**Recommendations**:
- Group commands by category (Accounts, Code Management, Configuration, etc.)
- Add command categories to help output
- Include more examples in help text

```typescript
// Group commands
program
  .command('accounts')
  .description('List your Investec accounts')
  .addHelpText('group', 'Account Management');

program
  .command('deploy')
  .description('Deploy code to card')
  .addHelpText('group', 'Code Management');
```

---

### 7. Configuration File Validation

**Current State**: Credentials file is read but not fully validated.

**Recommendations**:
```typescript
// Validate credential file structure
export function validateCredentialsFile(creds: Record<string, string>): void {
  const requiredFields = ['clientId', 'clientSecret', 'apiKey'];
  const missing = requiredFields.filter(field => !creds[field] || creds[field].trim() === '');
  
  if (missing.length > 0) {
    throw new CliError(
      ERROR_CODES.INVALID_CREDENTIALS,
      `Missing required fields: ${missing.join(', ')}`
    );
  }
}
```

---

### 8. Progress Indicators for File Operations

**Current State**: Some file operations (upload, fetch) don't show progress.

**Recommendations**:
- Show progress for large file uploads
- Display file size information
- Add estimated time remaining for long operations

```typescript
// Enhanced spinner with file size info
const spinner = createSpinner(!disableSpinner, `Uploading ${filename} (${fileSize} bytes)...`);
```

---

### 9. Command Exit Codes

**Current State**: Commands exit with code 1 on error (good), but could be more specific.

**Recommendations**:
- Use specific exit codes for different error types
- Document exit codes in README

```typescript
// Enhanced exit codes
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  VALIDATION_ERROR = 2,
  AUTH_ERROR = 3,
  FILE_ERROR = 4,
  API_ERROR = 5,
}
```

---

### 10. Interactive Confirmation for Destructive Operations

**Current State**: `pay` command has confirmation, but other destructive operations don't.

**Recommendations**:
- Add confirmation for `deploy` (overwrites existing code)
- Add confirmation for `transfer` (sends money)
- Add `--yes` flag to skip confirmation in CI/CD

```typescript
import { confirm } from '@inquirer/prompts';

if (!options.force) {
  const confirmed = await confirm({
    message: 'This will overwrite existing code on the card. Continue?',
    default: false,
  });
  if (!confirmed) {
    console.log('Operation cancelled.');
    return;
  }
}
```

**Files to Update**:
- `src/cmds/deploy.ts` - Add confirmation
- `src/cmds/transfer.ts` - Add confirmation (or enhance existing)

---

## 🟢 Low Priority Improvements

### 11. Command History/Logging

**Current State**: No command history tracking.

**Recommendations**:
- Optionally log commands to `~/.ipb/history.json`
- Useful for debugging and audit trails
- Can be disabled with `--no-history` flag

---

### 12. Autocomplete Support

**Current State**: No shell autocomplete.

**Recommendations**:
- Add autocomplete script generation for bash/zsh
- Command: `ipb completion [bash|zsh]`

```typescript
program
  .command('completion')
  .description('Generate shell completion script')
  .argument('<shell>', 'shell type (bash|zsh)')
  .action((shell) => {
    // Generate completion script
  });
```

---

### 13. Version Update Notification

**Current State**: Version checking exists but not actively used.

**Recommendations**:
- Check for updates on startup (with rate limiting)
- Show update notification if newer version available
- Add `--check-updates` flag

```typescript
// Check for updates (cache for 24 hours)
export async function checkForUpdates(force = false): Promise<void> {
  const lastCheck = getLastUpdateCheck();
  if (!force && lastCheck && Date.now() - lastCheck < 24 * 60 * 60 * 1000) {
    return; // Skip if checked recently
  }
  
  const latest = await checkLatestVersion();
  if (latest && latest !== version) {
    console.log(chalk.yellow(`\n⚠️  New version available: ${latest}`));
    console.log(chalk.yellow(`   Run: npm install -g investec-ipb@latest\n`));
  }
}
```

---

### 14. Better Table Formatting

**Current State**: Basic table formatting with `printTable`.

**Recommendations**:
- Use a library like `cli-table3` or `table` for better formatting
- Add column alignment
- Support for nested data
- Better handling of long values

---

### 15. Command Documentation Generation

**Current State**: README is manually maintained.

**Recommendations**:
- Auto-generate command documentation from Commander.js definitions
- Keep README in sync with actual commands
- Generate markdown from command help

---

### 16. Environment Variable Documentation

**Current State**: Environment variables mentioned but not fully documented.

**Recommendations**:
- Add `ipb env-list` command to show all supported environment variables
- Document each variable's purpose and format
- Add validation for environment variable values

---

### 17. Command Chaining/Piping

**Current State**: Commands are standalone.

**Recommendations**:
- Consider supporting command chaining for common workflows
- Example: `ipb accounts | ipb balances <accountId>`
- Or workflow commands: `ipb workflow deploy --test-first`

---

### 18. Better File Path Handling

**Current State**: File paths are strings without validation.

**Recommendations**:
- Normalize paths (handle `~/`, relative paths)
- Validate file extensions
- Check file permissions before operations
- Provide better error messages for path issues

---

### 19. Rate Limiting Indicators

**Current State**: No indication of API rate limits.

**Recommendations**:
- Show rate limit information in verbose mode
- Add retry logic with exponential backoff
- Display rate limit status

---

### 20. Configuration Profiles

**Current State**: Single credentials file.

**Recommendations**:
- Support multiple credential profiles
- `ipb config --profile production`
- `ipb deploy --profile production`
- Easier switching between environments

---

## 📋 Implementation Checklist

### Phase 1: Critical Improvements (Week 1)
- [ ] Enhanced input validation utilities
- [ ] Improved command descriptions with examples
- [ ] Enhanced error messages with suggestions
- [ ] Add confirmation for destructive operations

### Phase 2: User Experience (Week 2)
- [ ] Consistent JSON output across all commands
- [ ] Command aliases for common operations
- [ ] Better help text organization
- [ ] Configuration file validation

### Phase 3: Advanced Features (Week 3)
- [ ] Shell autocomplete support
- [ ] Version update notifications
- [ ] Better table formatting
- [ ] Command documentation generation

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

