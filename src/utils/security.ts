import chalk from 'chalk';
import { getSafeText } from './terminal.js';
import { isDebugEnabled } from './runtime-flags.js';

const SECRET_ENV_VARS = [
  'INVESTEC_CLIENT_SECRET',
  'INVESTEC_API_KEY',
  'INVESTEC_CARD_KEY',
  'OPENAI_API_KEY',
  'SANDBOX_KEY',
] as const;

export function detectSecretUsageFromEnv(): {
  secretsFromEnv: string[];
  hasSecretsFromEnv: boolean;
} {
  const secretsFromEnv: string[] = [];

  for (const envVar of SECRET_ENV_VARS) {
    if (process.env[envVar] !== undefined && process.env[envVar] !== '') {
      secretsFromEnv.push(envVar);
    }
  }

  return {
    secretsFromEnv,
    hasSecretsFromEnv: secretsFromEnv.length > 0,
  };
}

export function isNonInteractiveEnvironment(): boolean {
  if (!process.stdout.isTTY) {
    return true;
  }

  const ciEnvVars = [
    'CI',
    'CONTINUOUS_INTEGRATION',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'JENKINS_URL',
    'TRAVIS',
    'CIRCLECI',
    'BUILDKITE',
    'TEAMCITY_VERSION',
  ];

  for (const envVar of ciEnvVars) {
    if (process.env[envVar] !== undefined && process.env[envVar] !== '') {
      return true;
    }
  }

  const term = process.env.TERM;
  if (term === 'dumb' || term === undefined) {
    return false;
  }

  return false;
}

export function warnAboutSecretUsage(
  options: { verbose?: boolean; force?: boolean } = {}
): boolean {
  const { secretsFromEnv, hasSecretsFromEnv } = detectSecretUsageFromEnv();

  if (!hasSecretsFromEnv) {
    return false;
  }

  const shouldWarn =
    options.force || options.verbose || isDebugEnabled() || isNonInteractiveEnvironment();

  if (!shouldWarn) {
    return false;
  }

  const warningText = getSafeText(
    '⚠️  Security Warning: Secrets are being loaded from environment variables:'
  );
  console.warn(chalk.yellow(warningText));

  for (const envVar of secretsFromEnv) {
    console.warn(chalk.yellow(`   - ${envVar}`));
  }

  console.warn(
    chalk.yellow('\n   For better security, store secrets in credential files instead:')
  );
  console.warn(
    chalk.yellow('   - Run: ipb config --client-id <id> --client-secret <secret> --api-key <key>')
  );
  console.warn(
    chalk.yellow(
      '   - Or use profiles: ipb config --profile <name> --client-id <id> --client-secret <secret> --api-key <key>'
    )
  );
  console.warn(chalk.yellow('\n   Environment variables can be leaked in:'));
  console.warn(chalk.yellow('   - Process lists (ps, top)'));
  console.warn(chalk.yellow('   - System logs'));
  console.warn(chalk.yellow('   - CI/CD configuration files'));
  console.warn(chalk.yellow('   - Shell history'));
  console.warn('');

  return true;
}
