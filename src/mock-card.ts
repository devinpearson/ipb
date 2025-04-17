import type {
  AuthResponse,
  CardResponse,
  CodeResponse,
  CodeToggle,
  EnvResponse,
  ExecuteResult,
  ExecutionResult,
  ReferenceResponse,
  Transaction,
} from "investec-card-api";

export interface ICardApi {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  token: string;
  expiresIn: Date;

  getToken(): Promise<string>;
  getAccessToken(): Promise<AuthResponse>;
  uploadEnv(cardKey: number, env: object): Promise<EnvResponse>;
  uploadCode(cardKey: number, code: object): Promise<CodeResponse>;
  uploadPublishedCode(
    cardKey: number,
    codeId: string,
    code: string,
  ): Promise<CodeResponse>;
  getCards(): Promise<CardResponse>;
  getEnv(cardKey: number): Promise<EnvResponse>;
  getCode(cardKey: number): Promise<CodeResponse>;
  getPublishedCode(cardKey: number): Promise<CodeResponse>;
  toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle>;
  getExecutions(cardKey: number): Promise<ExecutionResult>;
  executeCode(
    code: string,
    transaction: Transaction,
    cardKey: number,
  ): Promise<ExecuteResult>;
  getCurrencies(): Promise<ReferenceResponse>;
  getCountries(): Promise<ReferenceResponse>;
  getMerchants(): Promise<ReferenceResponse>;
}

export class CardApi implements ICardApi {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  token: string;
  expiresIn: Date;
  constructor(
    clientId: string,
    clientSecret: string,
    apiKey: string,
    host?: string,
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiKey = apiKey;
    this.host = host || "https://openapi.investec.com";
    this.token = "";
    this.expiresIn = new Date();
    return this;
  }
  async getToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve("string");
    });
  }
  async getAccessToken(): Promise<AuthResponse> {
    const response = {
      access_token: "X3dxGAWD6rgCZPAtVxx3NQgmKGRN",
      token_type: "Bearer",
      expires_in: 1799,
      scope: "cards",
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async uploadEnv(cardKey: number, env: object): Promise<EnvResponse> {
    const response = {
      data: {
        result: {
          variables: {
            var1: "string",
          },
          createdAt: "2025-02-19T08:22:44.179Z",
          updatedAt: "2025-02-19T08:22:44.179Z",
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async uploadCode(cardKey: number, code: object): Promise<CodeResponse> {
    const response = {
      data: {
        result: {
          codeId: "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
          code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
          createdAt: "2025-02-19T08:22:44.179Z",
          updatedAt: "2025-02-19T08:22:44.179Z",
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async uploadPublishedCode(
    cardKey: number,
    codeId: string,
    code: string,
  ): Promise<CodeResponse> {
    const response = {
      data: {
        result: {
          codeId: "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
          code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
          createdAt: "2025-02-19T08:22:44.179Z",
          updatedAt: "2025-02-19T08:22:44.179Z",
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getCards(): Promise<CardResponse> {
    const response = {
      data: {
        cards: [
          {
            CardKey: 1111111,
            CardNumber: "402167XXXXXX1111",
            IsProgrammable: false,
            status: "Active",
            CardTypeCode: "VVG",
            AccountNumber: "10012421111",
            AccountId: "4675778129910189603221111",
          },
          {
            CardKey: 2222222,
            CardNumber: "402167XXXXXX2222",
            IsProgrammable: false,
            status: "string",
            CardTypeCode: "VGC",
            AccountNumber: "10012421111",
            AccountId: "4675778129910189603221111",
          },
        ],
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getEnv(cardKey: number): Promise<EnvResponse> {
    const response = {
      data: {
        result: {
          variables: {
            var1: "string",
          },
          createdAt: "2025-02-19T08:22:44.179Z",
          updatedAt: "2025-02-19T08:22:44.179Z",
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getCode(cardKey: number): Promise<CodeResponse> {
    const response = {
      data: {
        result: {
          codeId: "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
          code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
          createdAt: "2025-02-19T08:22:44.179Z",
          updatedAt: "2025-02-19T08:22:44.179Z",
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getPublishedCode(cardKey: number): Promise<CodeResponse> {
    const response = {
      data: {
        result: {
          codeId: "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
          code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
          createdAt: "2025-02-19T08:22:44.179Z",
          updatedAt: "2025-02-19T08:22:44.179Z",
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle> {
    const response = {
      data: {
        result: {
          Enabled: false,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getExecutions(cardKey: number): Promise<ExecutionResult> {
    const response = {
      data: {
        result: {
          executionItems: [
            {
              executionId: "D806BA8C-0298-4EA1-B3E3-17ACBB4ECCCC",
              rootCodeFunctionId: "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
              sandbox: false,
              type: "after_decline",
              authorizationApproved: null,
              logs: [
                {
                  createdAt: "2024-06-18T21:11:49.013Z",
                  level: "info",
                  content:
                    '{"accountNumber":"10012427365","dateTime":"2024-06-18T21:11:48.000Z","centsAmount":19900,"currencyCode":"zar","type":"card","reference":"22858392","card":{"id":"1611988","display":"402167XXXXXX6010"},"merchant":{"category":{"code":"5999","key":"miscellaneous_specialty_retail","name":"Miscellaneous Specialty Retail"},"name":"PAYFAST*Melon Mobile","city":"Paarl","country":{"code":"ZA","alpha3":"ZAF","name":"South Africa"}}}',
                },
              ],
              smsCount: 0,
              emailCount: 0,
              pushNotificationCount: 0,
              createdAt: "2024-06-18T21:11:48.55Z",
              startedAt: "2024-06-18T21:11:48.55Z",
              completedAt: "2024-06-18T21:11:49.131Z",
              updatedAt: "2024-06-18T21:11:48.55Z",
            },
            {
              executionId: "E5FC2351-A91D-4384-A953-57C75E497DDD",
              rootCodeFunctionId: "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
              sandbox: false,
              type: "before_transaction",
              authorizationApproved: null,
              logs: [
                {
                  createdAt: "2024-06-18T21:11:48.283Z",
                  level: "info",
                  content:
                    '{"accountNumber":"10012427365","dateTime":"2024-06-13T22:10:32.000Z","centsAmount":19900,"currencyCode":"zar","type":"card","reference":"22858392","card":{"id":"1611988","display":"402167XXXXXX6010"},"merchant":{"category":{"code":"5999","key":"miscellaneous_specialty_retail","name":"Miscellaneous Specialty Retail"},"name":"PAYFAST*Melon Mobile","city":"Paarl","country":{"code":"ZA","alpha3":"ZAF","name":"South Africa"}}}',
                },
              ],
              smsCount: 0,
              emailCount: 0,
              pushNotificationCount: 0,
              createdAt: "2024-06-18T21:11:47.741Z",
              startedAt: "2024-06-18T21:11:47.741Z",
              completedAt: "2024-06-18T21:11:48.391Z",
              updatedAt: "2024-06-18T21:11:47.741Z",
            },
          ],
          error: null,
        },
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async executeCode(
    code: string,
    transaction: Transaction,
    cardKey: number,
  ): Promise<ExecuteResult> {
    const response = {
      data: {
        result: [],
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getCurrencies(): Promise<ReferenceResponse> {
    const response = {
      data: {
        result: [
          {
            Code: "ZAR",
            Name: "South African Rand",
          },
          {
            Code: "GBP",
            Name: "British Pound",
          },
        ],
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getCountries(): Promise<ReferenceResponse> {
    const response = {
      data: {
        result: [
          {
            Code: "ZA",
            Name: "South Africa",
          },
          {
            Code: "GB",
            Name: "United Kingdom of Great Britain and Northern Ireland (the)",
          },
        ],
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
  async getMerchants(): Promise<ReferenceResponse> {
    const response = {
      data: {
        result: [
          {
            Code: "7623",
            Name: "A/C, Refrigeration Repair",
          },
          {
            Code: "8931",
            Name: "Accounting/Bookkeeping Services",
          },
        ],
      },
    };
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }
}
