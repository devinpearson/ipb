import type {
  AccountBalanceResponse,
  AccountDocumentsResponse,
  AccountResponse,
  AccountTransactionResponse,
  AuthResponse,
} from 'investec-mau-api';

/**
 * Mauritius (MAU) API surface used by the CLI (real client + mock).
 */
export interface IMauApi {
  getToken(): Promise<string>;
  getAccessToken(): Promise<AuthResponse>;
  getAccounts(): Promise<AccountResponse>;
  getAccountBalances(accountId: number | string): Promise<AccountBalanceResponse>;
  getAccountTransactions(
    accountId: number | string,
    fromDate: string,
    toDate: string
  ): Promise<AccountTransactionResponse>;
  getAccountDocuments(
    accountId: number | string,
    fromDate: string,
    toDate: string
  ): Promise<AccountDocumentsResponse>;
  downloadAccountStatement(accountId: number | string, date: string): Promise<ArrayBuffer>;
}

/**
 * In-process mock for Investec Mauritius Open Banking API.
 */
export class MauApi implements IMauApi {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;

  constructor(clientId: string, clientSecret: string, apiKey: string, host?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiKey = apiKey;
    this.host = host || 'https://openapi.investec.com';
  }

  async getToken(): Promise<string> {
    return Promise.resolve('MOCK_MAU_TOKEN');
  }

  async getAccessToken(): Promise<AuthResponse> {
    return Promise.resolve({
      access_token: 'MOCK_MAU_ACCESS_TOKEN_FOR_TESTING',
      token_type: 'Bearer',
      expires_in: 1799,
      scope: 'accounts',
    });
  }

  async getAccounts(): Promise<AccountResponse> {
    return Promise.resolve({
      data: {
        accounts: [
          {
            profileId: 9633,
            profileName: 'Mock Profile',
            accountId: 5331,
            accountName: 'Mock USD Account',
            accountNumber: '10101010101',
            accountCurrency: 'USD',
          },
        ],
      },
      links: { self: `${this.host}/mu/pb/v1/accounts` },
      meta: { totalPages: 1 },
    });
  }

  async getAccountBalances(accountId: number | string): Promise<AccountBalanceResponse> {
    return Promise.resolve({
      data: {
        accountNumber: String(accountId),
        accountType: 'CALL DEPOSIT',
        accountShortName: 'Mock Account',
        balance: 1043966.3,
        availableBalance: 635506.65,
        encumbrances: 152139.76,
        currency: 'USD',
        debitInterestRate: 0,
        creditInterestRate: 1.5,
        creditInterestAccrued: 100.25,
        debitInterestAccrued: 0,
        overDraftLimit: 0,
      },
      links: { self: `${this.host}/mu/pb/v1/accounts/${accountId}/balance` },
      meta: { totalPages: 1 },
    });
  }

  async getAccountTransactions(
    accountId: number | string,
    fromDate: string,
    toDate: string
  ): Promise<AccountTransactionResponse> {
    return Promise.resolve({
      data: {
        transactions: [
          {
            description: 'Mock credit',
            creditAmount: 100,
            debitAmount: 0,
            transactionDate: fromDate,
            bankReference: 'MOCK-REF-1',
            amount: 100,
            runningBalance: 1000,
            postDate: toDate,
          },
        ],
      },
      links: {
        self: `${this.host}/mu/pb/v1/accounts/${accountId}/transactions?fromDate=${fromDate}&toDate=${toDate}`,
      },
      meta: { totalPages: 1 },
    });
  }

  async getAccountDocuments(
    accountId: number | string,
    fromDate: string,
    _toDate: string
  ): Promise<AccountDocumentsResponse> {
    return Promise.resolve({
      availableDocuments: {
        accountNumber: String(accountId),
        documentInformation: [
          {
            documentDate: fromDate,
            documentType: 'Statement',
          },
        ],
      },
    });
  }

  async downloadAccountStatement(_accountId: number | string, _date: string): Promise<ArrayBuffer> {
    const pdfBytes = new TextEncoder().encode('%PDF-1.4 mock statement');
    return Promise.resolve(
      pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
    );
  }
}
