import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import { writeFileAtomic } from './credentials-store.js';
import { getSafeText } from './terminal.js';

interface UpdateNotificationOptions {
  isPiped: boolean;
  json?: boolean;
  yaml?: boolean;
  output?: string;
}

function getUpdateCheckCachePath(): string {
  return path.join(homedir(), '.ipb', 'update-check.json');
}

function getLastUpdateCheck(): number | null {
  try {
    const cachePath = getUpdateCheckCachePath();
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return data.lastCheck || null;
    }
  } catch {
    // Ignore errors reading cache
  }
  return null;
}

async function setLastUpdateCheck(): Promise<void> {
  try {
    const cachePath = getUpdateCheckCachePath();
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const jsonData = JSON.stringify({ lastCheck: Date.now() }, null, 2);
    await writeFileAtomic(cachePath, jsonData);
  } catch {
    // Ignore errors writing cache
  }
}

/**
 * Checks latest CLI version from npm registry.
 * @returns Latest version or null on failure
 */
export async function checkLatestVersion() {
  try {
    const response = await fetch('https://registry.npmjs.org/investec-ipb', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.npm.install-v1+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.statusText}`);
    }

    const data = (await response.json()) as { 'dist-tags': { latest: string } };
    return data['dist-tags'].latest;
  } catch {
    return null;
  }
}

/**
 * Checks for updates with 24-hour cache.
 * @param currentVersion - Current CLI version
 * @param force - Bypass cache and force check
 * @returns Latest version if update exists, otherwise null
 */
export async function checkForUpdates(
  currentVersion: string,
  force = false
): Promise<string | null> {
  const lastCheck = getLastUpdateCheck();
  const cacheDuration = 24 * 60 * 60 * 1000;

  if (!force && lastCheck && Date.now() - lastCheck < cacheDuration) {
    return null;
  }

  try {
    const latest = await checkLatestVersion();
    setLastUpdateCheck().catch(() => {
      // Ignore errors
    });

    if (latest && latest !== currentVersion) {
      return latest;
    }
  } catch {
    // Silent failure
  }

  return null;
}

/**
 * Displays update notification in terminal.
 * @param currentVersion - Current version
 * @param latestVersion - Latest available version
 */
export function showUpdateNotification(currentVersion: string, latestVersion: string): void {
  const warningText = getSafeText(
    `⚠️  New version available: ${latestVersion} (current: ${currentVersion})`
  );
  console.error(chalk.yellow(`\n${warningText}`));
  console.error(chalk.yellow('   Run: npm install -g investec-ipb@latest\n'));
}

/**
 * Determines whether update notifications should be displayed for the current output mode.
 * Suppresses notifications when output is intended for machine consumption.
 */
export function shouldDisplayUpdateNotification(options: UpdateNotificationOptions): boolean {
  return !options.isPiped && !options.json && !options.yaml && !options.output;
}
