import fs from 'node:fs';
import {
  access,
  chmod,
  constants,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { Credentials } from '../cmds/types.js';
import { CliError, ERROR_CODES } from '../errors.js';

const defaultCreds = {
  clientId: '',
  clientSecret: '',
  apiKey: '',
  cardKey: '',
  openaiKey: '',
  sandboxKey: '',
};

export function readCredentialsFileSync(
  credentialLocation: { filename: string; folder: string },
  onError?: (error: Error) => void
): Record<string, string> {
  if (fs.existsSync(credentialLocation.filename)) {
    try {
      const data = fs.readFileSync(credentialLocation.filename, 'utf8');
      return { ...defaultCreds, ...JSON.parse(data) };
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      return defaultCreds;
    }
  }
  return defaultCreds;
}

export async function readCredentialsFile(credentialLocation: {
  filename: string;
  folder: string;
}): Promise<Record<string, string>> {
  try {
    if (fs.existsSync(credentialLocation.filename)) {
      const data = await readFile(credentialLocation.filename, 'utf8');
      return { ...defaultCreds, ...JSON.parse(data) };
    }
    return defaultCreds;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read credentials file: ${message}`);
  }
}

export async function ensureCredentialsDirectory(credentialLocation: {
  folder: string;
}): Promise<void> {
  if (!fs.existsSync(credentialLocation.folder)) {
    await mkdir(credentialLocation.folder, { recursive: true });
  }
}

export async function loadCredentialsFile(credentials: Credentials, credentialsFile: string) {
  if (credentialsFile) {
    try {
      const file = await import(`file://${credentialsFile}`, {
        with: { type: 'json' },
      });

      const credentialKeys: (keyof Credentials)[] = [
        'host',
        'apiKey',
        'clientId',
        'clientSecret',
        'openaiKey',
        'sandboxKey',
        'cardKey',
      ];

      credentialKeys.forEach((key) => {
        if (file[key] !== undefined) {
          credentials[key] = file[key];
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load credentials file: ${message}`);
    }
  }
  return credentials;
}

export async function writeFileAtomic(
  filepath: string,
  data: string | Buffer,
  options: { permissions?: number } = {}
): Promise<void> {
  const dir = path.dirname(filepath);
  const filename = path.basename(filepath);
  const tempPath = path.join(dir, `.${filename}.tmp`);

  try {
    await ensureCredentialsDirectory({ folder: dir });
    await writeFile(tempPath, data, { encoding: 'utf8', flag: 'w' });

    const fd = await open(tempPath, 'r+');
    try {
      await fd.sync();
    } finally {
      await fd.close();
    }

    if (options.permissions !== undefined) {
      await chmod(tempPath, options.permissions);
    }

    await rename(tempPath, filepath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export async function cleanupTempFiles(dir: string): Promise<void> {
  try {
    if (!fs.existsSync(dir)) {
      return;
    }
    const files = await readdir(dir);
    const tempFiles = files.filter((f) => f.endsWith('.tmp'));
    const now = Date.now();

    for (const file of tempFiles) {
      const filePath = path.join(dir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > 3600000) {
          await unlink(filePath);
        }
      } catch {
        // Ignore errors for individual files
      }
    }
  } catch {
    // Ignore errors
  }
}

export async function writeCredentialsFile(
  filepath: string,
  data: Record<string, string>
): Promise<void> {
  const jsonData = JSON.stringify(data, null, 2);
  await writeFileAtomic(filepath, jsonData, { permissions: 0o600 });
}

export function getProfilesDirectory(): string {
  return path.join(homedir(), '.ipb', 'profiles');
}

export function getActiveProfileConfigPath(): string {
  return path.join(homedir(), '.ipb', 'active-profile.json');
}

export function getProfilePath(profileName: string): string {
  const profilesDir = getProfilesDirectory();
  return path.join(profilesDir, `${profileName}.json`);
}

export async function listProfiles(): Promise<string[]> {
  const profilesDir = getProfilesDirectory();
  if (!fs.existsSync(profilesDir)) {
    return [];
  }

  try {
    const files = await readdir(profilesDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}

export async function readProfile(profileName: string): Promise<Record<string, string>> {
  const profilePath = getProfilePath(profileName);
  if (!fs.existsSync(profilePath)) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Profile "${profileName}" does not exist. Use 'ipb config profile list' to see available profiles.`
    );
  }

  try {
    const data = await readFile(profilePath, 'utf8');
    return { ...defaultCreds, ...JSON.parse(data) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(
      ERROR_CODES.INVALID_CREDENTIALS,
      `Failed to read profile "${profileName}": ${message}`
    );
  }
}

export async function writeProfile(
  profileName: string,
  data: Record<string, string>
): Promise<void> {
  const profilesDir = getProfilesDirectory();
  await ensureCredentialsDirectory({ folder: profilesDir });

  const profilePath = getProfilePath(profileName);
  await writeCredentialsFile(profilePath, data);
}

export async function deleteProfile(profileName: string): Promise<void> {
  const profilePath = getProfilePath(profileName);
  if (!fs.existsSync(profilePath)) {
    throw new CliError(ERROR_CODES.FILE_NOT_FOUND, `Profile "${profileName}" does not exist.`);
  }

  try {
    await access(profilePath, constants.F_OK);
    await unlink(profilePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Failed to delete profile "${profileName}": ${message}`
    );
  }
}

export async function getActiveProfile(): Promise<string | null> {
  const activeProfilePath = getActiveProfileConfigPath();
  if (!fs.existsSync(activeProfilePath)) {
    return null;
  }

  try {
    const data = await readFile(activeProfilePath, 'utf8');
    const config = JSON.parse(data);
    return config.profile || null;
  } catch {
    return null;
  }
}

export async function setActiveProfile(profileName: string | null): Promise<void> {
  const activeProfilePath = getActiveProfileConfigPath();
  const configDir = path.dirname(activeProfilePath);

  await ensureCredentialsDirectory({ folder: configDir });

  if (profileName === null) {
    if (fs.existsSync(activeProfilePath)) {
      await unlink(activeProfilePath);
    }
  } else {
    const jsonData = JSON.stringify({ profile: profileName }, null, 2);
    await writeFileAtomic(activeProfilePath, jsonData, { permissions: 0o600 });
  }
}

export async function loadProfile(
  credentials: Credentials,
  profileName?: string
): Promise<Credentials> {
  if (!profileName) {
    return credentials;
  }

  try {
    const profileData = await readProfile(profileName);
    return {
      ...credentials,
      ...profileData,
    };
  } catch (error) {
    if (error instanceof CliError && error.code === ERROR_CODES.FILE_NOT_FOUND) {
      throw error;
    }
    throw error;
  }
}
