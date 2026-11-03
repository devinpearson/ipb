/// <reference types="vitest" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configCommand } from '../../src/cmds/set';
import { readKeychainSecret } from '../../src/utils/os-keychain';

// The test setup gives this file a temp HOME and an in-memory keychain.
const ipb = (...parts: string[]) => path.join(os.homedir(), '.ipb', ...parts);
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const base = { verbose: false, spinner: false };

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(ipb(), { recursive: true, force: true });
});

describe('ipb config --keychain', () => {
  it('moves secrets into the keychain and back out again', async () => {
    await configCommand({ ...base, clientId: 'cid', clientSecret: 's3cret', apiKey: 'k3y' });

    await configCommand({ ...base, keychain: true });
    const inKeychain = readJson(ipb('.credentials.json'));
    expect(inKeychain.secretStore).toBe('keychain');
    expect(inKeychain).not.toHaveProperty('clientSecret');
    expect(inKeychain).not.toHaveProperty('apiKey');
    expect(JSON.parse(readKeychainSecret('default') ?? '')).toEqual({
      clientSecret: 's3cret',
      apiKey: 'k3y',
    });

    await configCommand({ ...base, keychain: false });
    const inFile = readJson(ipb('.credentials.json'));
    expect(inFile).not.toHaveProperty('secretStore');
    expect(inFile).toMatchObject({ clientId: 'cid', clientSecret: 's3cret', apiKey: 'k3y' });
    expect(readKeychainSecret('default')).toBeNull();
  });

  it('saves updated secrets to the keychain while it is in use', async () => {
    await configCommand({
      ...base,
      profile: 'prod',
      clientId: 'cid',
      apiKey: 'old',
      keychain: true,
    });

    await configCommand({ ...base, profile: 'prod', apiKey: 'new' });

    expect(readJson(ipb('profiles', 'prod.json'))).toEqual(
      expect.not.objectContaining({ apiKey: expect.anything() })
    );
    expect(JSON.parse(readKeychainSecret('profile:prod') ?? '')).toEqual({ apiKey: 'new' });
  });

  it('lets secrets be entered again when the keychain item has gone', async () => {
    await configCommand({ ...base, clientId: 'cid', apiKey: 'k3y', keychain: true });
    const { deleteKeychainSecret } = await import('../../src/utils/os-keychain');
    deleteKeychainSecret('default');

    await configCommand({ ...base, apiKey: 'again' });

    expect(JSON.parse(readKeychainSecret('default') ?? '')).toEqual({ apiKey: 'again' });
    expect(readJson(ipb('.credentials.json')).clientId).toBe('cid');
  });

  it('does not overwrite a profile it cannot read', async () => {
    fs.mkdirSync(ipb('profiles'), { recursive: true });
    fs.writeFileSync(ipb('profiles', 'prod.json'), '{ not json');

    await expect(configCommand({ ...base, profile: 'prod', clientId: 'new' })).rejects.toThrow(
      /Failed to read profile/
    );
    expect(fs.readFileSync(ipb('profiles', 'prod.json'), 'utf8')).toBe('{ not json');
  });

  it('says so when secrets are already where they were asked to go', async () => {
    await configCommand({ ...base, clientId: 'cid', apiKey: 'k3y' });

    await configCommand({ ...base, keychain: false });

    expect(console.log).toHaveBeenCalledWith('Secrets are already in the file.');
  });
});
