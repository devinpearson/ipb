#!/usr/bin/env node
import "dotenv/config";
import process from "process";
import fs from "fs";
import {
  cardsCommand,
  configCommand,
  logsCommand,
  deployCommand,
  fetchCommand,
  uploadCommand,
  envCommand,
  uploadEnvCommand,
  publishedCommand,
  publishCommand,
  enableCommand,
  disableCommand,
  runCommand,
  currenciesCommand,
  countriesCommand,
  merchantsCommand,
  newCommand,
} from "./cmds/index.js";
import { homedir } from "os";
import { Command, Option } from "commander";
import chalk from "chalk";
import { simulateCommand } from "./cmds/simulate.js";
import { InvestecCardApi, type AuthResponse, type CardResponse, type CodeResponse, type CodeToggle, type EnvResponse, type ExecuteResult, type ExecutionResult, type ReferenceResponse, type Transaction } from "investec-card-api";
const version = "0.7.8";
const program = new Command();
export const credentialLocation = {
  folder: `${homedir()}/.ipb`,
  filename: `${homedir()}/.ipb/.credentials.json`,
};
export async function printTitleBox() {
  //   const v = await checkLatestVersion()
  console.log("");
  console.log("🦓 Investec Programmable Banking CLI");
  console.log("🔮 " + chalk.blueBright(`v${version}`));
  //   if (v !== version) {
  // console.log("🔥 " + chalk.redBright(`v${v} is available`))
  //   };
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("");
}

let cred = {
  clientId: "",
  clientSecret: "",
  apiKey: "",
  cardKey: "",
};
if (fs.existsSync(credentialLocation.filename)) {
  try {
    const data = fs.readFileSync(credentialLocation.filename, "utf8");
    cred = JSON.parse(data);
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        chalk.red(`🙀 Invalid credentials file format: ${err.message}`),
        console.log(""),
      );
    } else {
      console.error(chalk.red("🙀 Invalid credentials file format"));
      console.log("");
    }
  }
}
export interface Credentials {
  host: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
}

export interface BasicOptions {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}

interface ICardApi {
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
        uploadPublishedCode(cardKey: number, codeId: string, code: string): Promise<CodeResponse>;
        getCards(): Promise<CardResponse>;
        getEnv(cardKey: number): Promise<EnvResponse>;
        getCode(cardKey: number): Promise<CodeResponse>;
        getPublishedCode(cardKey: number): Promise<CodeResponse>;
        toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle>;
        getExecutions(cardKey: number): Promise<ExecutionResult>;
        executeCode(code: string, transaction: Transaction, cardKey: number): Promise<ExecuteResult>;
        getCurrencies(): Promise<ReferenceResponse>;
        getCountries(): Promise<ReferenceResponse>;
        getMerchants(): Promise<ReferenceResponse>;
}

class CardApi implements ICardApi {
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
        this.host = host || "https://openapi.investec.com";
        this.token = "";
        this.expiresIn = new Date();
        return this;
    }
    async getToken(): Promise<string> {
        return new Promise((resolve, reject) => {resolve("string")});
    }
    async getAccessToken(): Promise<AuthResponse> {
        const response = {
            access_token: 'X3dxGAWD6rgCZPAtVxx3NQgmKGRN',
            token_type: 'Bearer',
            expires_in: 1799,
            scope: 'cards',
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async uploadEnv(cardKey: number, env: object): Promise<EnvResponse> {
        const response = {
            data: {
                result: {
                    variables: {
                        "var1": "string",
                    },
                    createdAt: '2025-02-19T08:22:44.179Z',
                    updatedAt: '2025-02-19T08:22:44.179Z',
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async uploadCode(cardKey: number, code: object): Promise<CodeResponse> {
        const response = {
            data: {
                result: {
                    codeId: 'EA729EB9-79B4-4AF9-AE6A-B9BE4702C111',
                    code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
                    createdAt: '2025-02-19T08:22:44.179Z',
                    updatedAt: '2025-02-19T08:22:44.179Z',
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async uploadPublishedCode(cardKey: number, codeId: string, code: string): Promise<CodeResponse> {
        const response = {
            data: {
                result: {
                    codeId: 'EA729EB9-79B4-4AF9-AE6A-B9BE4702C111',
                    code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
                    createdAt: '2025-02-19T08:22:44.179Z',
                    updatedAt: '2025-02-19T08:22:44.179Z',
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getCards(): Promise<CardResponse> {
        const response = {
            data: {
                cards: [
                    {
                        CardKey: 1111111,
                        CardNumber: '402167XXXXXX1111',
                        IsProgrammable: false,
                        status: 'Active',
                        CardTypeCode: 'VVG',
                        AccountNumber: '10012421111',
                        AccountId: '4675778129910189603221111',
                    },
                    {
                        CardKey: 2222222,
                        CardNumber: '402167XXXXXX2222',
                        IsProgrammable: false,
                        status: 'string',
                        CardTypeCode: 'VGC',
                        AccountNumber: '10012421111',
                        AccountId: '4675778129910189603221111',
                    },
                ]
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getEnv(cardKey: number): Promise<EnvResponse> {
        const response = {
            data: {
                result: {
                    variables: {
                        "var1": "string",
                    },
                    createdAt: '2025-02-19T08:22:44.179Z',
                    updatedAt: '2025-02-19T08:22:44.179Z',
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getCode(cardKey: number): Promise<CodeResponse> {
        const response = {
            data: {
                result: {
                    codeId: 'EA729EB9-79B4-4AF9-AE6A-B9BE4702C111',
                    code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
                    createdAt: '2025-02-19T08:22:44.179Z',
                    updatedAt: '2025-02-19T08:22:44.179Z',
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getPublishedCode(cardKey: number): Promise<CodeResponse> {
        const response = {
            data: {
                result: {
                    codeId: 'EA729EB9-79B4-4AF9-AE6A-B9BE4702C111',
                    code: "// This function runs before a transaction.\nconst beforeTransaction = async (authorization) => {\n    console.log(authorization);\n  };\n  // This function runs after a transaction was successful.\n  const afterTransaction = async (transaction) => {\n    console.log(transaction);\n  };\n  // This function runs after a transaction was declined.\n  const afterDecline = async (transaction) => {\n    console.log(transaction);\n  };\n  ",
                    createdAt: '2025-02-19T08:22:44.179Z',
                    updatedAt: '2025-02-19T08:22:44.179Z',
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle> {
        const response = {
            data: {
                result: {
                    Enabled: false,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getExecutions(cardKey: number): Promise<ExecutionResult> {
        const response = {
            data: {
                result: {
                    executionItems: [{
                        "executionId": "D806BA8C-0298-4EA1-B3E3-17ACBB4ECCCC",
                        "rootCodeFunctionId": "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
                        "sandbox": false,
                        "type": "after_decline",
                        "authorizationApproved": null,
                        "logs": [
                            {
                                "createdAt": "2024-06-18T21:11:49.013Z",
                                "level": "info",
                                "content": "{\"accountNumber\":\"10012427365\",\"dateTime\":\"2024-06-18T21:11:48.000Z\",\"centsAmount\":19900,\"currencyCode\":\"zar\",\"type\":\"card\",\"reference\":\"22858392\",\"card\":{\"id\":\"1611988\",\"display\":\"402167XXXXXX6010\"},\"merchant\":{\"category\":{\"code\":\"5999\",\"key\":\"miscellaneous_specialty_retail\",\"name\":\"Miscellaneous Specialty Retail\"},\"name\":\"PAYFAST*Melon Mobile\",\"city\":\"Paarl\",\"country\":{\"code\":\"ZA\",\"alpha3\":\"ZAF\",\"name\":\"South Africa\"}}}"
                            }
                        ],
                        "smsCount": 0,
                        "emailCount": 0,
                        "pushNotificationCount": 0,
                        "createdAt": "2024-06-18T21:11:48.55Z",
                        "startedAt": "2024-06-18T21:11:48.55Z",
                        "completedAt": "2024-06-18T21:11:49.131Z",
                        "updatedAt": "2024-06-18T21:11:48.55Z"
                    },
                    {
                        "executionId": "E5FC2351-A91D-4384-A953-57C75E497DDD",
                        "rootCodeFunctionId": "EA729EB9-79B4-4AF9-AE6A-B9BE4702C111",
                        "sandbox": false,
                        "type": "before_transaction",
                        "authorizationApproved": null,
                        "logs": [
                            {
                                "createdAt": "2024-06-18T21:11:48.283Z",
                                "level": "info",
                                "content": "{\"accountNumber\":\"10012427365\",\"dateTime\":\"2024-06-13T22:10:32.000Z\",\"centsAmount\":19900,\"currencyCode\":\"zar\",\"type\":\"card\",\"reference\":\"22858392\",\"card\":{\"id\":\"1611988\",\"display\":\"402167XXXXXX6010\"},\"merchant\":{\"category\":{\"code\":\"5999\",\"key\":\"miscellaneous_specialty_retail\",\"name\":\"Miscellaneous Specialty Retail\"},\"name\":\"PAYFAST*Melon Mobile\",\"city\":\"Paarl\",\"country\":{\"code\":\"ZA\",\"alpha3\":\"ZAF\",\"name\":\"South Africa\"}}}"
                            }
                        ],
                        "smsCount": 0,
                        "emailCount": 0,
                        "pushNotificationCount": 0,
                        "createdAt": "2024-06-18T21:11:47.741Z",
                        "startedAt": "2024-06-18T21:11:47.741Z",
                        "completedAt": "2024-06-18T21:11:48.391Z",
                        "updatedAt": "2024-06-18T21:11:47.741Z"
                    },],
                    error: null,
                }
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async executeCode(code: string, transaction: Transaction, cardKey: number): Promise<ExecuteResult> {
        const response = {
            data: {
                result: []
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getCurrencies(): Promise<ReferenceResponse> {
        const response = {
            data: {
                result: [{
                    "Code": "ZAR",
                    "Name": "South African Rand"
                },
                {
                    "Code": "GBP",
                    "Name": "British Pound"
                },]
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getCountries(): Promise<ReferenceResponse> {
        const response = {
            data: {
                result: [{
                    "Code": "ZA",
                    "Name": "South Africa"
                },
                {
                    "Code": "GB",
                    "Name": "United Kingdom of Great Britain and Northern Ireland (the)"
                },]
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
    async getMerchants(): Promise<ReferenceResponse> {
        const response = {
            data: {
                result: [{
                    "Code": "7623",
                    "Name": "A/C, Refrigeration Repair"
                },
                {
                    "Code": "8931",
                    "Name": "Accounting/Bookkeeping Services"
                },]
            }
        }
        return new Promise((resolve, reject) => {resolve(response)});
    }
}

export async function initializeApi(
  credentials: Credentials,
  options: BasicOptions,
) {
  printTitleBox();
  credentials = await optionCredentials(options, credentials);
  let api;
  if (process.env.DEBUG) {
    api = new CardApi(
          credentials.clientId,
          credentials.clientSecret,
          credentials.apiKey,
          credentials.host,
        );
    } else {
    api = new InvestecCardApi(
        credentials.clientId,
        credentials.clientSecret,
        credentials.apiKey,
        credentials.host,
    );
}
  const accessResult = await api.getAccessToken();
  if (accessResult.scope !== "cards") {
    console.log(
      chalk.redBright(
        "Scope is not only cards, please consider reducing the scopes",
      ),
    );
    console.log("");
  }
  return api;
}
export async function optionCredentials(
  options: BasicOptions,
  credentials: any,
) {
  if (options.credentialsFile) {
    credentials = await loadcredentialsFile(
      credentials,
      options.credentialsFile,
    );
  }
  if (options.apiKey) {
    credentials.apiKey = options.apiKey;
  }
  if (options.clientId) {
    credentials.clientId = options.clientId;
  }
  if (options.clientSecret) {
    credentials.clientSecret = options.clientSecret;
  }
  if (options.host) {
    credentials.host = options.host;
  }
  return credentials;
}
export async function loadcredentialsFile(
  credentials: Credentials,
  credentialsFile: string,
) {
  if (credentialsFile) {
    const file = await import("file://" + credentialsFile, {
      with: { type: "json" },
    });
    if (file.host) {
      credentials.host = file.host;
    }
    if (file.apiKey) {
      credentials.apiKey = file.apiKey;
    }
    if (file.clientId) {
      credentials.clientId = file.clientId;
    }
    if (file.clientSecret) {
      credentials.clientSecret = file.clientSecret;
    }
  }
  return credentials;
}
export const credentials: Credentials = {
  host: process.env.INVESTEC_HOST || "https://openapi.investec.com",
  clientId: process.env.INVESTEC_CLIENT_ID || cred.clientId,
  clientSecret: process.env.INVESTEC_CLIENT_SECRET || cred.clientSecret,
  apiKey: process.env.INVESTEC_API_KEY || cred.apiKey,
  cardKey: process.env.INVESTEC_CARD_KEY || cred.cardKey,
};
async function main() {
  program
    .name("ipb")
    .description("CLI to manage Investec Programmable Banking")
    .version(version);

  program
    .command("cards")
    .description("Gets a list of your cards")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(cardsCommand);

  program
    .command("config")
    .description("set auth credentials")
    .option("--api-key <apiKey>", "Sets your api key for the Investec API")
    .option(
      "--client-id <clientId>",
      "Sets your client Id for the Investec API",
    )
    .option(
      "--client-secret <clientSecret>",
      "Sets your client secret for the Investec API",
    )
    .option("--card-key <cardKey>", "Sets your card key for the Investec API")
    .option("-v,--verbose", "additional debugging information")
    .action(configCommand);

  program
    .command("deploy")
    .description("deploy code to card")
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run", "development")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(deployCommand);

  program
    .command("logs")
    .description("fetches logs from the api")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(logsCommand);

  program
    .command("run")
    .description("runs the code locally")
    .option("-f,--filename <filename>", "the filename")
    .option("-e,--env <env>", "env to run", "development")
    .option("-a,--amount <amount>", "amount in cents", "10000")
    .option("-u,--currency <currency>", "currency code", "zar")
    .option("-z,--mcc <mcc>", "merchant category code", "0000")
    .option("-m,--merchant <merchant>", "merchant name", "The Coders Bakery")
    .option("-i,--city <city>", "city name", "Cape Town")
    .option("-o,--country <country>", "country code", "ZA")
    .option("-v,--verbose", "additional debugging information")
    .action(runCommand);

  program
    .command("fetch")
    .description("fetches the saved code")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(fetchCommand);

  program
    .command("upload")
    .description("uploads to saved code")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(uploadCommand);

  program
    .command("env")
    .description("downloads to env to a local file")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(envCommand);

  program
    .command("upload-env")
    .description("uploads env to the card")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(uploadEnvCommand);

  program
    .command("published")
    .description("downloads to published code to a local file")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(publishedCommand);

  program
    .command("publish")
    .description("publishes code to the card")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("-i,--code-id <codeId>", "the code id of the save code")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(publishCommand);
  program
    .command("simulate")
    .description("runs the code using the online simulator")
    .requiredOption("-f,--filename <filename>", "the filename")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("-e,--env <env>", "env to run", "development")
    .option("-a,--amount <amount>", "amount in cents", "10000")
    .option("-u,--currency <currency>", "currency code", "zar")
    .option("-z,--mcc <mcc>", "merchant category code", "0000")
    .option("-m,--merchant <merchant>", "merchant name", "The Coders Bakery")
    .option("-i,--city <city>", "city name", "Cape Town")
    .option("-o,--country <country>", "country code", "ZA")
    .option("-v,--verbose", "additional debugging information")
    .action(simulateCommand);
  program
    .command("enable")
    .description("enables code to be used on card")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(enableCommand);

  program
    .command("disable")
    .description("disables code to be used on card")
    .option("-c,--card-key <cardKey>", "the cardkey")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(disableCommand);

  program
    .command("currencies")
    .description("Gets a list of supported currencies")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(currenciesCommand);

  program
    .command("countries")
    .description("Gets a list of countries")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(countriesCommand);

  program
    .command("merchants")
    .description("Gets a list of merchants")
    .option("--api-key <apiKey>", "api key for the Investec API")
    .option("--client-id <clientId>", "client Id for the Investec API")
    .option(
      "--client-secret <clientSecret>",
      "client secret for the Investec API",
    )
    .option("--host <host>", "Set a custom host for the Investec Sandbox API")
    .option(
      "--credentials-file <credentialsFile>",
      "Set a custom credentials file",
    )
    .option("-v,--verbose", "additional debugging information")
    .action(merchantsCommand);

  program
    .command("new")
    .description("Sets up scaffoldings for a new project")
    .argument("<string>", "name of the new project")
    .option("-v,--verbose", "additional debugging information")
    .addOption(
      new Option("--template <template>", "name of the template to use")
        .default("default")
        .choices(["default", "petro"]),
    )
    .action(newCommand);

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof Error) {
      console.log("🙀 Error encountered: " + chalk.red(err.message));
      console.log("");
    } else {
      console.log(
        "🙀 Error encountered: " + chalk.red("An unknown error occurred"),
      );
      console.log("");
    }
  }
}

export async function checkLatestVersion() {
  const response = await fetch("https://registry.npmjs.org/investec-ipb", {
    method: "GET",
    headers: {
      Accept: "application/vnd.npm.install-v1+json",
    },
  });

  const data = (await response.json()) as { "dist-tags": { latest: string } };
  const latestVersion = data["dist-tags"].latest;

  return latestVersion;
}

main();
