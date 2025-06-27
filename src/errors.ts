// Custom error class for CLI errors with codes and friendly messages
export class CliError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(`Error (${code}): ${message}`);
    this.code = code;
    this.name = "CliError";
  }
}

// Example error codes and messages
export const ERROR_CODES = {
  MISSING_API_TOKEN: "E4002",
  MISSING_CARD_KEY: "E4003",
  MISSING_ENV_FILE: "E4004",
  INVALID_CREDENTIALS: "E4005",
  DEPLOY_FAILED: "E5001",
  TEMPLATE_NOT_FOUND: "E4007",
  INVALID_PROJECT_NAME: "E4008",
  PROJECT_EXISTS: "E4009",
  FILE_NOT_FOUND: "E4010",
  MISSING_EMAIL_OR_PASSWORD: "E4011", // Added for register command
  MISSING_ACCOUNT_ID: "E4012", // Added for balances command
  // Add more as needed
};

// Helper to throw a custom error
export function throwCliError(code: string, message: string): never {
  throw new CliError(code, message);
}

// Helper to format error output (for use in catch blocks)
export function printCliError(error: unknown) {
  if (error instanceof CliError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error("An unknown error occurred.");
  }
}
