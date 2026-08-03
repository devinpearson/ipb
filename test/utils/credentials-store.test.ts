/// <reference types="vitest" />

import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Credentials } from '../../src/cmds/types.js';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import { loadCredentialsFile } from '../../src/utils/credentials-store.js';

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  await mkdir(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

function getBaseCredentials(): Credentials {
  return {
    host: 'https://openapi.investec.com',
    apiKey: '',
    clientId: '',
    clientSecret: '',
    cardKey: '',
    openaiKey: '',
    sandboxKey: '',
  };
}

describe('loadCredentialsFile', () => {
  it('loads credentials from a relative JSON path', async () => {
    const tempDir = await createTempDir('ipb-creds-relative');
    const credentialsPath = path.join(tempDir, 'credentials.json');
    await writeFile(
      credentialsPath,
      JSON.stringify({
        apiKey: 'test-api-key',
        clientId: 'test-client-id',
      })
    );

    const previousCwd = process.cwd();
    process.chdir(tempDir);
    try {
      const loaded = await loadCredentialsFile(getBaseCredentials(), './credentials.json');
      expect(loaded.apiKey).toBe('test-api-key');
      expect(loaded.clientId).toBe('test-client-id');
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('merges only known credential keys from file', async () => {
    const tempDir = await createTempDir('ipb-creds-known-keys');
    const credentialsPath = path.join(tempDir, 'credentials.json');
    await writeFile(
      credentialsPath,
      JSON.stringify({
        apiKey: 'test-api-key',
        host: 'https://example.test',
        unknownField: 'ignore-me',
      })
    );

    const loaded = await loadCredentialsFile(getBaseCredentials(), credentialsPath);
    expect(loaded.apiKey).toBe('test-api-key');
    expect(loaded.host).toBe('https://example.test');
    expect((loaded as Credentials & { unknownField?: string }).unknownField).toBeUndefined();
  });

  it('unwraps ESM-style { default: { ... } } when no credential keys exist at top level', async () => {
    const tempDir = await createTempDir('ipb-creds-default-export');
    const credentialsPath = path.join(tempDir, 'credentials.json');
    await writeFile(
      credentialsPath,
      JSON.stringify({
        default: {
          clientId: 'nested-client-id',
          clientSecret: 'nested-secret',
          apiKey: 'nested-api-key',
        },
      })
    );

    const loaded = await loadCredentialsFile(getBaseCredentials(), credentialsPath);
    expect(loaded.clientId).toBe('nested-client-id');
    expect(loaded.clientSecret).toBe('nested-secret');
    expect(loaded.apiKey).toBe('nested-api-key');
  });

  it('throws CliError when credentials file has invalid JSON', async () => {
    const tempDir = await createTempDir('ipb-creds-bad-json');
    const credentialsPath = path.join(tempDir, 'bad.json');
    await writeFile(credentialsPath, '{ not valid json');

    await expect(loadCredentialsFile(getBaseCredentials(), credentialsPath)).rejects.toSatisfy(
      (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.INVALID_CREDENTIALS
    );
  });

  it('throws CliError when credentials file path does not exist', async () => {
    const tempDir = await createTempDir('ipb-creds-missing');
    const missingPath = path.join(tempDir, 'nope.json');

    await expect(loadCredentialsFile(getBaseCredentials(), missingPath)).rejects.toMatchObject({
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });
});
