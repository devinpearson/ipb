/**
 * Common options shared by most CLI commands.
 * These options are typically passed to command handlers for API authentication and configuration.
 *
 * @property host - The API host URL.
 * @property apiKey - The API key for authentication.
 * @property clientId - The client ID for authentication.
 * @property clientSecret - The client secret for authentication.
 * @property credentialsFile - Path to the credentials file.
 * @property verbose - Enable verbose output for debugging.
 */
export interface CommonOptions {
  /** The API host URL. */
  host: string;
  /** The API key for authentication. */
  apiKey: string;
  /** The client ID for authentication. */
  clientId: string;
  /** The client secret for authentication. */
  clientSecret: string;
  /** Path to the credentials file. */
  credentialsFile: string;
  /** Enable verbose output for debugging. */
  verbose: boolean;
}

/**
 * Credentials used for Investec API and programmable banking features.
 *
 * @property host - The API host URL.
 * @property clientId - The client ID for authentication.
 * @property clientSecret - The client secret for authentication.
 * @property apiKey - The API key for authentication.
 * @property cardKey - The programmable card key.
 * @property openaiKey - The OpenAI API key for LLM features.
 * @property sandboxKey - The sandbox key for LLM features.
 */
export interface Credentials {
  /** The API host URL. */
  host: string;
  /** The client ID for authentication. */
  clientId: string;
  /** The client secret for authentication. */
  clientSecret: string;
  /** The API key for authentication. */
  apiKey: string;
  /** The programmable card key. */
  cardKey: string;
  /** The OpenAI API key for LLM features. */
  openaiKey: string;
  /** The sandbox key for LLM features. */
  sandboxKey: string;
}

/**
 * Basic options for API calls, typically used for authentication and configuration.
 *
 * @property host - The API host URL.
 * @property apiKey - The API key for authentication.
 * @property clientId - The client ID for authentication.
 * @property clientSecret - The client secret for authentication.
 * @property credentialsFile - Path to the credentials file.
 */
export interface BasicOptions {
  /** The API host URL. */
  host: string;
  /** The API key for authentication. */
  apiKey: string;
  /** The client ID for authentication. */
  clientId: string;
  /** The client secret for authentication. */
  clientSecret: string;
  /** Path to the credentials file. */
  credentialsFile: string;
}
