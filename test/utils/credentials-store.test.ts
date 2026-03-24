/// <reference types="vitest" />

import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Credentials } from '../../src/cmds/types.js';
import { loadCredentialsFile } from '../../src/utils/credentials-store.js';

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
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
});
