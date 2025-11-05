import type {
  AccountBalanceResponse,
  AccountResponse,
  AccountTransaction,
  AccountTransactionResponse,
  AuthResponse,
  Beneficiary,
  BeneficiaryResponse,
  TransferMultiple,
  TransferResponse,
} from 'investec-pb-api';

// Inline types copied from investec-pb-api (not exported)
// PayMultiple is defined in investec-pb-api but not exported
export interface PayMultiple {
  beneficiaryId: string;
  amount: string;
  myReference: string;
  theirReference: string;
}

export interface IPbApi {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  token: string;
  expiresIn: Date;

  getToken(): Promise<string>;
  getAccessToken(): Promise<AuthResponse>;
  getAccounts(): Promise<AccountResponse>;
  getAccountBalances(accountId: string): Promise<AccountBalanceResponse>;
  getAccountTransactions(
    accountId: string,
    fromDate?: string | null,
    toDate?: string | null,
    transactionType?: string | null
  ): Promise<AccountTransactionResponse>;
  getBeneficiaries(): Promise<BeneficiaryResponse>;
  transferMultiple(
    accountId: string,
    transfers: TransferMultiple[] | TransferMultiple
  ): Promise<TransferResponse>;
  payMultiple(accountId: string, payments: PayMultiple[] | PayMultiple): Promise<TransferResponse>;
}

export class PbApi implements IPbApi {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  token: string;
  expiresIn: Date;
  constructor(clientId: string, clientSecret: string, apiKey: string, host?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiKey = apiKey;
    this.host = host || 'https://openapi.investec.com';
    this.token = '';
    this.expiresIn = new Date();
  }
  async getToken(): Promise<string> {
    return Promise.resolve('MOCK_PB_TOKEN');
  }
  async getAccessToken(): Promise<AuthResponse> {
    return Promise.resolve({
      access_token: 'MOCK_PB_ACCESS_TOKEN_FOR_TESTING',
      token_type: 'Bearer',
      expires_in: 1799,
      scope: 'accounts balances transactions beneficiaries transfer pay',
    });
  }
  async getAccountBalances(accountId: string): Promise<AccountBalanceResponse> {
    // Return a single AccountBalance object as expected by the CLI
    return Promise.resolve({
      data: {
        accountId,
        currentBalance: 1000.0,
        availableBalance: 900.0,
        budgetBalance: 800.0,
        straightBalance: 700.0,
        cashBalance: 600.0,
        currency: 'ZAR',
      },
    }) as unknown as Promise<AccountBalanceResponse>;
  }
  async getAccounts(): Promise<AccountResponse> {
    const account = {
      accountId: 'mock-account-id',
      accountNumber: '123456',
      accountName: 'Mock Account',
      referenceName: 'Main',
      productName: 'Cheque',
      kycCompliant: true,
      profileId: 'profile1',
      profileName: 'Personal',
    };
    return Promise.resolve({
      data: {
        accounts: [account],
      },
    }) as unknown as Promise<AccountResponse>;
  }
  async getAccountTransactions(
    accountId: string,
    _fromDate?: string | null,
    _toDate?: string | null,
    _transactionType?: string | null
  ): Promise<AccountTransactionResponse> {
    const transaction: AccountTransaction = {
      accountId,
      type: 'credit',
      transactionType: 'deposit',
      status: 'posted',
      description: 'Test Transaction',
      cardNumber: null,
      postedOrder: 1,
      postingDate: new Date().toISOString(),
      valueDate: new Date().toISOString(),
      actionDate: new Date().toISOString(),
      transactionDate: new Date().toISOString(),
      amount: 100.0,
      runningBalance: 1000.0,
      uuid: 't1',
    };
    return Promise.resolve({
      data: {
        transactions: [transaction],
      },
    });
  }
  async getBeneficiaries(): Promise<BeneficiaryResponse> {
    const beneficiary: Beneficiary = {
      beneficiaryId: 'b1',
      accountNumber: '111111',
      code: 'INV',
      bank: 'Investec',
      beneficiaryName: 'John Doe',
      lastPaymentAmount: '100.00',
      lastPaymentDate: new Date().toISOString(),
      cellNo: '0820000000',
      emailAddress: 'john@example.com',
      name: 'John Doe',
      referenceAccountNumber: '123456',
      referenceName: 'Main',
      categoryId: 'cat1',
      profileId: 'profile1',
      fasterPaymentAllowed: true,
    };
    return Promise.resolve({
      data: [beneficiary],
      links: { self: 'mock' },
      meta: { totalPages: 1 },
    });
  }
  async payMultiple(
    _accountId: string,
    payments: PayMultiple[] | PayMultiple
  ): Promise<TransferResponse> {
    // Mock payMultiple for CLI compatibility
    const paymentsArray = Array.isArray(payments) ? payments : [payments];
    return Promise.resolve({
      data: {
        TransferResponses: paymentsArray.map((p: PayMultiple, i: number) => ({
          PaymentReferenceNumber: `PRN${i + 1}`,
          PaymentDate: new Date().toISOString(),
          Status: 'success',
          BeneficiaryName: 'John Doe',
          BeneficiaryAccountId: p.beneficiaryId,
          AuthorisationRequired: false,
        })),
      },
    });
  }

  async transferMultiple(
    _accountId: string,
    transfers: Array<{ beneficiaryAccountId: string }> | { beneficiaryAccountId: string }
  ): Promise<TransferResponse> {
    // Mock transferMultiple for CLI compatibility
    const transfersArray = Array.isArray(transfers) ? transfers : [transfers];
    return Promise.resolve({
      data: {
        TransferResponses: transfersArray.map((t, i: number) => ({
          PaymentReferenceNumber: `PRN${i + 1}`,
          PaymentDate: new Date().toISOString(),
          Status: 'success',
          BeneficiaryName: 'John Doe',
          BeneficiaryAccountId: t.beneficiaryAccountId,
          AuthorisationRequired: false,
        })),
      },
    });
  }
}
