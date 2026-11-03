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

// --- Response shape types ---

export interface Account {
  accountId: string;
  accountNumber: string;
  referenceName: string;
  productName: string;
}

export interface AccountBalance {
  accountId: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  budgetBalance: number;
  straightBalance: number;
  cashBalance: number;
}

export interface Transaction {
  uuid: string;
  amount: number;
  transactionDate: string;
  description: string;
}

export interface MauAccount {
  accountId: number;
  accountNumber: string;
  accountName?: string;
  accountCurrency: string;
  profileId: number;
  profileName: string;
}

export interface MauBalance {
  accountNumber: string;
  accountType: string;
  accountShortName: string;
  balance: number;
  availableBalance: number;
  encumbrances: number;
  currency: string;
  debitInterestRate: number;
  creditInterestRate: number;
  creditInterestAccrued: number;
  debitInterestAccrued: number;
  overDraftLimit?: number;
}

export interface MauTransaction {
  description: string;
  creditAmount: number;
  debitAmount: number;
  transactionDate: string;
  bankReference: string;
  amount: number;
  runningBalance: number;
  postDate?: string;
}

export interface MauDocument {
  documentDate: string;
  documentType: string;
  accountNumber: string;
}
