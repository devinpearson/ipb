# Test Coverage Suggestions

## Current Test Status

✅ **Tests Passing**: 11 tests across 5 test files
- `cards.test.ts` - 3 tests
- `accounts.test.ts` - 3 tests
- `balances.test.ts` - 2 tests
- `transactions.test.ts` - 2 tests
- `deploy.test.ts` - 1 test

## Missing Test Coverage

### High Priority - Core Commands (No Tests)

1. **`beneficiaries.ts`** - Fetch beneficiaries
   - Test successful fetch and display
   - Test no beneficiaries found
   - Test error handling

2. **`transfer.ts`** - Transfer between accounts
   - Test successful transfer
   - Test insufficient funds error
   - Test invalid account ID error
   - Test validation of amount format

3. **`pay.ts`** - Pay a beneficiary
   - Test successful payment
   - Test invalid beneficiary ID
   - Test insufficient funds
   - Test validation of amount and reference

4. **`deploy.ts`** - Deploy code to card
   - Test successful deployment
   - Test file not found error
   - Test invalid card key
   - Test environment variable handling

5. **`fetch.ts`** - Fetch saved code from card
   - Test successful fetch and file write
   - Test file write errors
   - Test invalid card key
   - Test API not supporting fetch

6. **`upload.ts`** - Upload code to card
   - Test successful upload
   - Test file read errors
   - Test invalid card key

7. **`publish.ts`** - Publish code to card
   - Test successful publish
   - Test invalid code ID
   - Test card key validation

8. **`env.ts`** - Download environment variables
   - Test successful download
   - Test file write errors
   - Test invalid card key

9. **`upload-env.ts`** - Upload environment variables
   - Test successful upload
   - Test file read errors
   - Test invalid JSON format

10. **`published.ts`** - Fetch published code
    - Test successful fetch
    - Test file write errors
    - Test invalid card key

11. **`logs.ts`** - Fetch logs from API
    - Test successful log fetch
    - Test file write errors
    - Test invalid card key

12. **`run.ts`** - Run code locally
    - Test successful execution
    - Test file not found
    - Test invalid transaction data
    - Test environment file loading

13. **`simulate.ts`** - Simulate code execution
    - Test successful simulation
    - Test file not found
    - Test API errors
    - Test transaction creation

14. **`enable.ts`** - Enable code on card
    - Test successful enable
    - Test invalid card key
    - Test already enabled

15. **`disable.ts`** - Disable code on card
    - Test successful disable
    - Test invalid card key
    - Test already disabled

16. **`currencies.ts`** - List currencies
    - Test successful fetch and display
    - Test error handling

17. **`countries.ts`** - List countries
    - Test successful fetch and display
    - Test error handling

18. **`merchants.ts`** - List merchants
    - Test successful fetch and display
    - Test error handling

19. **`new.ts`** - Create new project
    - Test successful project creation
    - Test file already exists (with --force)
    - Test file already exists (without --force)
    - Test template selection
    - Test directory creation

20. **`ai.ts`** - Generate code with AI
    - Test successful code generation
    - Test file write errors
    - Test force overwrite
    - Test OpenAI API errors
    - Test prompt validation

21. **`bank.ts`** - LLM bank interaction
    - Test successful function calls
    - Test invalid prompts
    - Test API errors
    - Test function selection

22. **`login.ts`** - Login to LLM service
    - Test successful login
    - Test invalid credentials
    - Test credential file writing
    - Test file permission setting

23. **`register.ts`** - Register for LLM service
    - Test successful registration
    - Test duplicate email
    - Test invalid email format
    - Test password validation

24. **`set.ts`** - Set credentials
    - Test setting card key
    - Test setting OpenAI key
    - Test setting sandbox key
    - Test credential file writing
    - Test file permissions

### Medium Priority - Utility Functions

25. **`utils.ts`** - Utility functions
    - `handleCliError` - Test error formatting, verbose output, process exit
    - `withCommandContext` - Test context attachment to errors
    - `readCredentialsFileSync` - Test file read, parse errors, missing file
    - `readCredentialsFile` - Test async file read, errors
    - `writeCredentialsFile` - Test file write, permission setting
    - `loadCredentialsFile` - Test credential merging, file errors
    - `createSpinner` - Test enabled/disabled spinner
    - `initializeApi` - Test API initialization, credential merging
    - `initializePbApi` - Test PB API initialization
    - `normalizeCardKey` - Test string/number conversion
    - `printTable` - Test table formatting, empty data
    - `checkLatestVersion` - Test version checking, network errors

26. **`errors.ts`** - Error handling
    - `CliError` class - Test error creation, message formatting
    - `printCliError` - Test error printing for different error types

27. **`index.ts`** - Main entry point
    - `optionCredentials` - Test credential merging
    - `printTitleBox` - Test function execution
    - Command registration - Test all commands are registered

### Low Priority - Integration Tests

28. **End-to-end CLI tests**
    - Test complete command workflows
    - Test error propagation through `withCommandContext`
    - Test credential file loading at module initialization
    - Test command argument parsing

29. **Error context testing**
    - Verify all commands have proper error context
    - Test error messages use correct command names

## Test Implementation Template

```typescript
/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { commandName } from '../../src/cmds/command-file';

vi.mock('../../src/index.ts', () => ({
  credentials: {},
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    initializeApi: vi.fn(), // or initializePbApi
    createSpinner: vi.fn(() => ({
      start: vi.fn(function() { return this; }),
      stop: vi.fn(),
    })),
    printTable: vi.fn(),
    // Add other mocked utilities as needed
  };
});

const { initializeApi } = await import('../../src/utils.ts');

const mockApi = {
  // Mock API methods
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe('commandName', () => {
  it('should handle successful operation', async () => {
    // Test implementation
  });

  it('should handle error cases', async () => {
    // Test implementation
  });

  it('should propagate errors correctly', async () => {
    // Test error propagation
  });
});
```

## Testing Best Practices

1. **Mock Strategy**: Use partial mocks with `vi.importActual` to preserve actual implementations where possible
2. **Error Testing**: Test that errors propagate correctly (no try-catch in commands)
3. **Context Testing**: Verify error context is attached via `withCommandContext`
4. **File Operations**: Mock file system operations for commands that read/write files
5. **API Mocking**: Mock API calls to avoid network dependencies
6. **Edge Cases**: Test empty results, null values, missing files, invalid inputs
7. **Type Safety**: Ensure all mocks match the actual function signatures

## Coverage Goals

- **Target**: 80%+ code coverage
- **Priority**: Critical paths first (deploy, fetch, upload, publish)
- **Focus**: Error handling and edge cases
- **Integration**: Test command workflows end-to-end

