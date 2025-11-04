# Code Review & Improvement Suggestions

## Executive Summary

This is a well-structured CLI tool for managing Investec Programmable Banking. The codebase demonstrates good organization and modern TypeScript practices. However, there are several areas for improvement in type safety, error handling, testing, and code quality.

---

## 🔴 Critical Issues

### 1. Type Safety - Extensive Use of `any`

**Issue**: The codebase uses `any` types extensively, which defeats TypeScript's type checking benefits.

**Found in**:
- `src/utils.ts:5` - `error: any` in `handleCliError`
- `src/index.ts:341` - `credentials: any` in `optionCredentials`
- `src/cmds/login.ts:27` - `options: any` in `loginCommand`
- All catch blocks use `error: any` (36+ occurrences)
- `src/function-calls.ts:197` - Function definitions use `any[]`

**Recommendation**:
```typescript
// Instead of:
export function handleCliError(error: any, ...)

// Use:
export function handleCliError(error: unknown, ...)

// In catch blocks:
} catch (error: unknown) {
  if (error instanceof Error) {
    // handle Error
  } else if (error instanceof CliError) {
    // handle CliError
  }
}
```

**Priority**: High - Type safety is crucial for maintainability

---

### 2. Inconsistent Error Handling

**Issue**: Error handling is inconsistent across commands. Some use `CliError`, others use generic `Error`.

**Examples**:
- `src/cmds/login.ts:65` - Uses generic `Error` instead of `CliError`
- `src/cmds/register.ts:56` - Uses generic `Error` instead of `CliError`
- Many commands catch `any` but don't check error types

**Recommendation**:
- Standardize on `CliError` for all CLI-specific errors
- Create error type guards
- Use consistent error codes from `ERROR_CODES`

**Priority**: High - Better error handling improves user experience

---

### 3. Missing Error Code in ERROR_CODES

**Issue**: `src/errors.ts:13` has a syntax error - missing comma after `MISSING_API_TOKEN: "E4002"`

**Current**:
```typescript
export const ERROR_CODES = {
  MISSING_API_TOKEN: "E4002"  // Missing comma
  MISSING_CARD_KEY: "E4003",
```

**Recommendation**: Fix the syntax error

**Priority**: High - This is a syntax error that may cause issues

---

## 🟡 Important Improvements

### 4. Dead/Commented Code

**Issue**: There's commented-out code in multiple files that should be removed or uncommented.

**Found in**:
- `src/index.ts:60-65` - Entire `printTitleBox` function is commented
- `src/utils.ts:169` - Commented debug log
- `src/cmds/deploy.ts:49,57` - Commented console.log statements

**Recommendation**:
- Remove commented code if not needed
- Use proper logging/debugging infrastructure if needed
- Consider using a debug library (like `debug` package) instead of commenting code

**Priority**: Medium - Clean code is easier to maintain

---

### 5. Inconsistent Type Definitions

**Issue**: `loginCommand` accepts `options: any` but other similar commands use proper types.

**Example**:
- `src/cmds/login.ts:27` - `options: any`
- `src/cmds/register.ts:17` - `options: Options` (properly typed)

**Recommendation**: Type `loginCommand` options properly:
```typescript
interface LoginOptions extends CommonOptions {
  email: string;
  password: string;
}

export async function loginCommand(options: LoginOptions) {
  // ...
}
```

**Priority**: Medium - Consistency improves maintainability

---

### 6. File System Operations Not Using Async/Await Consistently

**Issue**: Mix of sync and async file operations.

**Found in**:
- `src/cmds/login.ts:84,88` - Uses `await fs.writeFileSync` (sync function with await)
- `src/index.ts:79` - Uses `fs.readFileSync` (sync)

**Recommendation**:
- Use `fs.promises.writeFile` instead of `fs.writeFileSync`
- Use `fs.promises.readFile` instead of `fs.readFileSync`
- Or use `import { readFile, writeFile } from 'fs/promises'`

**Priority**: Medium - Prevents blocking the event loop

---

### 7. Credential File Security

**Issue**: Credential files are stored in plain text without file permissions being set.

**Found in**:
- `src/cmds/login.ts:84,88` - Writes credentials without setting restrictive permissions
- `src/cmds/set.ts` - Similar issue

**Recommendation**:
```typescript
import { chmod } from 'fs/promises';

await fs.promises.writeFile(credentialLocation.filename, JSON.stringify(cred), {
  mode: 0o600  // Read/write for owner only
});
await chmod(credentialLocation.filename, 0o600);
```

**Priority**: High - Security concern

---

### 8. Missing ESLint Configuration

**Issue**: No ESLint configuration found, but there's a Prettier config.

**Recommendation**:
- Add ESLint with TypeScript support
- Use `@typescript-eslint/recommended` and `@typescript-eslint/strict`
- Configure to catch `any` usage
- Add to CI pipeline

**Priority**: Medium - Helps catch issues early

---

### 9. Test Coverage Gaps

**Issue**: Limited test files and many untracked test files in git.

**Found**:
- Only 6 test files in `test/cmds/`
- Many commands lack tests
- Untracked test files: `test/README.md`, `test/README.md.extra`, `test/__mocks__/`, etc.

**Recommendation**:
- Add tests for all commands
- Track test files in git
- Add coverage reporting
- Consider adding integration tests for critical paths

**Priority**: Medium - Tests improve confidence in changes

---

### 10. Missing JSDoc Comments

**Issue**: Many functions lack JSDoc comments, making it harder to understand their purpose.

**Good Example**: `src/cmds/accounts.ts:6-9` has good JSDoc

**Recommendation**: Add JSDoc to all exported functions:
```typescript
/**
 * Fetches and displays Investec accounts.
 * @param options - CLI options including API credentials
 * @throws {CliError} When API credentials are invalid or API call fails
 */
```

**Priority**: Low - Documentation improves developer experience

---

## 🟢 Minor Improvements

### 11. String Comparison Inconsistency

**Issue**: `src/utils.ts:141,168` uses `==` instead of `===` for string comparison.

**Current**:
```typescript
if (process.env.DEBUG == "true") {
```

**Recommendation**: Use strict equality:
```typescript
if (process.env.DEBUG === "true") {
```

**Priority**: Low - Best practice

---

### 12. Markdown Linter Warning

**Issue**: `.github/copilot-instructions.md` has a linter warning about first line not being a heading.

**Recommendation**: Add a heading at the top of the file

**Priority**: Low - Cosmetic

---

### 13. Duplicate Code in Credential Loading

**Issue**: Similar credential loading logic appears in multiple places.

**Found in**:
- `src/index.ts:69-92` - Credential loading
- `src/cmds/login.ts:69-88` - Similar credential loading

**Recommendation**: Extract to a shared utility function

**Priority**: Low - DRY principle

---

### 14. Missing Input Validation

**Issue**: Some commands don't validate required inputs before making API calls.

**Example**: `src/cmds/deploy.ts:25` - Checks for `cardKey` but type is `number` when it should be `string | number`

**Recommendation**: Add validation early and use proper types

**Priority**: Medium - Prevents runtime errors

---

### 15. Inconsistent Error Context Messages

**Issue**: Error context messages in `handleCliError` calls are inconsistent.

**Examples**:
- `"fetch accounts"` vs `"deploy code"` vs `"login"`

**Recommendation**: Standardize format (e.g., all lowercase or all "action object")

**Priority**: Low - Consistency

---

## 📋 Recommended Action Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix syntax error in `ERROR_CODES`
2. ✅ Replace all `any` types with proper types (`unknown` for errors)
3. ✅ Standardize error handling to use `CliError`
4. ✅ Fix credential file security (set file permissions)

### Phase 2: Important Improvements (Week 2)
5. ✅ Add ESLint configuration
6. ✅ Remove dead/commented code
7. ✅ Fix async file operations
8. ✅ Add proper types to `loginCommand` and other `any` types

### Phase 3: Quality Improvements (Week 3-4)
9. ✅ Add JSDoc comments to all exported functions
10. ✅ Improve test coverage
11. ✅ Extract duplicate credential loading logic
12. ✅ Add input validation

### Phase 4: Polish (Ongoing)
13. ✅ Fix markdown linter warnings
14. ✅ Standardize error messages
15. ✅ Code review and refactoring

---

## 🎯 Quick Wins

These can be implemented immediately:

1. **Fix syntax error** in `src/errors.ts` (missing comma)
2. **Replace `==` with `===`** in `src/utils.ts`
3. **Add heading** to `.github/copilot-instructions.md`
4. **Set file permissions** on credential files
5. **Remove commented code** or uncomment if needed

---

## 📊 Code Quality Metrics

- **Type Safety**: ⚠️ Moderate (extensive `any` usage)
- **Error Handling**: ⚠️ Moderate (inconsistent patterns)
- **Test Coverage**: ⚠️ Low (limited tests)
- **Documentation**: ✅ Good (README is comprehensive)
- **Security**: ⚠️ Moderate (credential handling needs improvement)
- **Code Organization**: ✅ Good (clear structure)

---

## 🔗 Additional Resources

- [TypeScript Error Handling Best Practices](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript)
- [Node.js File Permissions](https://nodejs.org/api/fs.html#file-system-flags)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)

---

## Conclusion

The codebase is well-structured and functional. The main areas for improvement are:
1. **Type safety** - Eliminate `any` types
2. **Error handling** - Standardize on `CliError`
3. **Security** - Secure credential files
4. **Testing** - Increase coverage

Addressing these issues will significantly improve code quality, maintainability, and developer confidence.

