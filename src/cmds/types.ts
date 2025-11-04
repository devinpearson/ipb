// Common options shared by most CLI commands
export interface CommonOptions {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
  spinner?: boolean; // allow disabling spinner
  json?: boolean; // output in JSON format
  yaml?: boolean; // output in YAML format
  output?: string; // output file path for JSON/YAML
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
