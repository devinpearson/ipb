// Common options shared by most CLI commands
export interface CommonOptions {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  profile?: string; // configuration profile name
  verbose: boolean;
  spinner?: boolean; // allow disabling spinner
  json?: boolean; // output in JSON format
  yaml?: boolean; // output in YAML format
  output?: string; // output file path for JSON/YAML
  yes?: boolean; // skip confirmation prompts for destructive operations
}

export interface Credentials {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
  openaiKey: string;
  sandboxKey: string;
  /** Investec Mauritius (MAU) API host */
  mauHost: string;
  mauClientId: string;
  mauClientSecret: string;
  mauApiKey: string;
}

export interface BasicOptions {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}

/** CLI options for Mauritius (MAU) API commands */
export interface MauOptions {
  mauHost?: string;
  mauApiKey?: string;
  mauClientId?: string;
  mauClientSecret?: string;
  credentialsFile?: string;
  profile?: string;
  verbose: boolean;
  spinner?: boolean;
  json?: boolean;
  yaml?: boolean;
  output?: string;
}

/** Credential override options for MAU API initialization */
export interface MauBasicOptions {
  mauHost?: string;
  mauApiKey?: string;
  mauClientId?: string;
  mauClientSecret?: string;
  credentialsFile?: string;
  profile?: string;
}
