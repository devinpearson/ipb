import chalk from 'chalk';
import { printTitleBox } from '../runtime-credentials.js';
import { isStdoutPiped, runListCommand } from '../utils.js';
import type { CommonOptions } from './types.js';

/**
 * Environment variable definition with documentation.
 */
interface EnvVarDefinition {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  example: string;
  category: 'API Credentials' | 'AI Generation' | 'Development' | 'Security' | 'Test Transactions';
}

/**
 * Lists all supported environment variables with their descriptions and usage.
 * @param options - CLI options including output format
 */
export async function envListCommand(options: CommonOptions) {
  const isPiped = isStdoutPiped();
  printTitleBox();

  const envVars: EnvVarDefinition[] = [
    {
      name: 'INVESTEC_HOST',
      description: 'API host URL for the Investec API. Used for API endpoint configuration.',
      required: false,
      default: 'https://openapi.investec.com',
      example: 'https://openapi.investec.com',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_CLIENT_ID',
      description:
        'Client ID for authenticating with the Investec API. Get this from the Investec Developer Portal.',
      required: true,
      example: 'your-client-id',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_CLIENT_SECRET',
      description:
        'Client secret for authenticating with the Investec API. Get this from the Investec Developer Portal.',
      required: true,
      example: 'your-client-secret',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_API_KEY',
      description:
        'API key for accessing the Investec API. Get this from the Investec Developer Portal.',
      required: true,
      example: 'your-api-key',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_CARD_KEY',
      description:
        'Card identifier (key) for your programmable card. Use this to target specific cards.',
      required: false,
      example: '123456',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_MAU_HOST',
      description:
        'API host URL for the Investec Mauritius (MAU) Open Banking API. Defaults to the same production host as ZA APIs.',
      required: false,
      default: 'https://openapi.investec.com',
      example: 'https://openapi.investec.com',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_MAU_CLIENT_ID',
      description:
        'Client ID for authenticating with the Investec Mauritius (MAU) API. Separate from ZA PB/Card credentials.',
      required: false,
      example: 'your-mau-client-id',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_MAU_CLIENT_SECRET',
      description:
        'Client secret for authenticating with the Investec Mauritius (MAU) API. Separate from ZA PB/Card credentials.',
      required: false,
      example: 'your-mau-client-secret',
      category: 'API Credentials',
    },
    {
      name: 'INVESTEC_MAU_API_KEY',
      description:
        'API key for accessing the Investec Mauritius (MAU) API. Separate from ZA PB/Card credentials.',
      required: false,
      example: 'your-mau-api-key',
      category: 'API Credentials',
    },
    {
      name: 'OPENAI_API_KEY',
      description:
        'OpenAI API key (reserved for future use; the `ipb ai` command is currently disabled).',
      required: false,
      example: 'sk-...',
      category: 'AI Generation',
    },
    {
      name: 'SANDBOX_KEY',
      description:
        'Sandbox access token (reserved for future use; `ipb login` and AI commands are currently disabled).',
      required: false,
      example: 'your-sandbox-token',
      category: 'AI Generation',
    },
    {
      name: 'DEBUG',
      description:
        'Verbose / debug output (equivalent to --verbose when no flag is passed). Also enables mock Investec APIs together with in-process test data. For recordings without verbose logs, use IPB_MOCK_APIS instead.',
      required: false,
      default: 'false',
      example: 'true',
      category: 'Development',
    },
    {
      name: 'IPB_MOCK_APIS',
      description:
        'Use in-process mock Programmable Banking, Card, and Mauritius (MAU) API clients (no network). Does not enable verbose output. For offline demos, set dummy INVESTEC_* / INVESTEC_MAU_* credentials or use a local credentials file.',
      required: false,
      default: 'false',
      example: '1',
      category: 'Development',
    },
    {
      name: 'IPB_READ_ONLY',
      description:
        'Block payments, transfers and card code changes (pay, transfer, deploy, upload, upload-env, publish, enable, disable) with error E4022. Reads and --dry-run still work. Use when an AI agent or script runs ipb. Can also be stored with `ipb config --read-only`.',
      required: false,
      default: 'false',
      example: '1',
      category: 'Security',
    },
    {
      name: 'IPB_JSON_ERRORS',
      description:
        'Print every failure as one JSON object on stderr ({"error":{"code","name","message","exitCode","command","hint"}}), as --json does for that command.',
      required: false,
      default: 'false',
      example: '1',
      category: 'Security',
    },
    {
      name: 'IPB_TX_AMOUNT',
      description: 'Default transaction amount in cents for `run` and `simulate` (--amount wins).',
      required: false,
      default: '10000',
      example: '2500',
      category: 'Test Transactions',
    },
    {
      name: 'IPB_TX_CURRENCY',
      description: 'Default currency code (ISO 4217) for `run` and `simulate` (--currency wins).',
      required: false,
      default: 'zar',
      example: 'USD',
      category: 'Test Transactions',
    },
    {
      name: 'IPB_TX_MCC',
      description: 'Default merchant category code for `run` and `simulate` (--mcc wins).',
      required: false,
      default: '0000',
      example: '5411',
      category: 'Test Transactions',
    },
    {
      name: 'IPB_TX_MERCHANT',
      description: 'Default merchant name for `run` and `simulate` (--merchant wins).',
      required: false,
      default: 'The Coders Bakery',
      example: 'Corner Cafe',
      category: 'Test Transactions',
    },
    {
      name: 'IPB_TX_CITY',
      description: 'Default merchant city for `run` and `simulate` (--city wins).',
      required: false,
      default: 'Cape Town',
      example: 'Durban',
      category: 'Test Transactions',
    },
    {
      name: 'IPB_TX_COUNTRY',
      description:
        'Default country code (ISO 3166-1 alpha-2) for `run` and `simulate` (--country wins).',
      required: false,
      default: 'ZA',
      example: 'US',
      category: 'Test Transactions',
    },
    {
      name: 'IPB_NO_UPDATE_CHECK',
      description:
        'Skip npm registry version checks (no network). Recommended when generating terminal recordings or running fully offline.',
      required: false,
      default: 'false',
      example: '1',
      category: 'Development',
    },
    {
      name: 'REJECT_UNAUTHORIZED',
      description:
        'SSL certificate validation control. Set to "false" to disable SSL certificate validation (not recommended for production).',
      required: false,
      default: 'true',
      example: 'false',
      category: 'Security',
    },
  ];

  // Group by category
  const grouped: Record<string, EnvVarDefinition[]> = {};
  envVars.forEach((envVar) => {
    if (!grouped[envVar.category]) {
      grouped[envVar.category] = [];
    }
    const category = grouped[envVar.category];
    if (category) {
      category.push(envVar);
    }
  });

  if (options.json || options.yaml || options.output || isPiped) {
    const output = envVars.map((envVar) => ({
      name: envVar.name,
      description: envVar.description,
      required: envVar.required,
      default: envVar.default,
      example: envVar.example,
      category: envVar.category,
    }));

    await runListCommand({
      isPiped,
      items: output,
      outputOptions: { json: options.json, yaml: options.yaml, output: options.output },
      emptyMessage: 'No environment variables found',
      countMessage: () => '',
    });
    return;
  }

  // Default formatted output
  console.log(chalk.bold('📋 Supported Environment Variables\n'));

  Object.entries(grouped).forEach(([category, vars]) => {
    console.log(chalk.cyan.bold(`\n${category}`));
    console.log(chalk.gray('─'.repeat(60)));

    vars?.forEach((envVar) => {
      console.log(chalk.bold(`\n${envVar.name}`));
      console.log(`  ${envVar.description}`);
      console.log(chalk.gray(`  Required: ${envVar.required ? 'Yes' : 'No'}`));
      if (envVar.default) {
        console.log(chalk.gray(`  Default: ${envVar.default}`));
      }
      console.log(chalk.green(`  Example: ${envVar.name}=${envVar.example}`));
    });
  });

  console.log(chalk.bold('\n\n📝 Usage Examples\n'));
  console.log(chalk.gray('1. Set environment variables in your shell:'));
  console.log(chalk.green('   export INVESTEC_CLIENT_ID="your-client-id"'));
  console.log(chalk.green('   export INVESTEC_CLIENT_SECRET="your-client-secret"'));
  console.log(chalk.green('   export INVESTEC_API_KEY="your-api-key"\n'));

  console.log(chalk.gray('2. Use a .env file in your project root:'));
  console.log(chalk.green('   INVESTEC_HOST=https://openapi.investec.com'));
  console.log(chalk.green('   INVESTEC_CLIENT_ID=your-client-id'));
  console.log(chalk.green('   INVESTEC_CLIENT_SECRET=your-client-secret'));
  console.log(chalk.green('   INVESTEC_API_KEY=your-api-key\n'));

  console.log(chalk.gray('3. Override via command line:'));
  console.log(
    chalk.green('   ipb cards --client-id <id> --client-secret <secret> --api-key <key>\n')
  );

  console.log(chalk.gray('4. Priority order (highest to lowest):'));
  console.log(chalk.yellow('   1. Command line options'));
  console.log(chalk.yellow('   2. Environment variables'));
  console.log(chalk.yellow('   3. Credentials file (~/.ipb/credentials.json)'));
}
