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
}

export interface BasicOptions {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
