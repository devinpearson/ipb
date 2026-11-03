/// <reference types="vitest" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import {
  deleteProfile,
  deleteStoredCredentials,
  readCredentialsFile,
  readProfile,
  writeCredentialsFile,
  writeProfile,
} from '../../src/utils/credentials-store';
import { readKeychainSecret, writeKeychainSecret } from '../../src/utils/os-keychain';

// The test setup gives this file a temp HOME and an in-memory keychain.
const ipb = (...parts: string[]) => path.join(os.homedir(), '.ipb', ...parts);
const defaultLocation = { folder: ipb(), filename: ipb('.credentials.json') };
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

afterEach(() => {
  fs.rmSync(ipb(), { recursive: true, force: true });
});

describe('credentials kept in the OS keychain', () => {
  it('writes secrets to the keychain and only non-secret settings to the profile file', async () => {
    await writeProfile('prod', {
      clientId: 'cid',
      clientSecret: 's3cret',
      apiKey: 'k3y',
      openaiKey: '',
      secretStore: 'keychain',
    });

    expect(readJson(ipb('profiles', 'prod.json'))).toEqual({
      clientId: 'cid',
      secretStore: 'keychain',
    });
    expect(JSON.parse(readKeychainSecret('profile:prod') ?? '')).toEqual({
      clientSecret: 's3cret',
      apiKey: 'k3y',
    });
    expect(await readProfile('prod')).toMatchObject({
      clientId: 'cid',
      clientSecret: 's3cret',
      apiKey: 'k3y',
    });
  });

  it('leaves files without secretStore alone', async () => {
    await writeCredentialsFile(defaultLocation.filename, { clientId: 'cid', clientSecret: 's' });

    expect(readJson(defaultLocation.filename)).toEqual({ clientId: 'cid', clientSecret: 's' });
    expect(readKeychainSecret('default')).toBeNull();
  });

  it('fails clearly when the keychain item is missing, unless asked to allow it', async () => {
    fs.mkdirSync(ipb(), { recursive: true });
    fs.writeFileSync(
      defaultLocation.filename,
      JSON.stringify({ clientId: 'cid', secretStore: 'keychain' })
    );

    const error = await readCredentialsFile(defaultLocation).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe(ERROR_CODES.SECRET_STORE_ERROR);
    expect((error as CliError).message).toContain('Run `ipb config`');

    expect(await readCredentialsFile(defaultLocation, { allowMissingSecrets: true })).toMatchObject(
      {
        clientId: 'cid',
        clientSecret: '',
      }
    );
  });

  it('rejects a keychain item that is not ipb data', async () => {
    await writeProfile('prod', { clientId: 'cid', secretStore: 'keychain' });
    writeKeychainSecret('profile:prod', 'not json');

    await expect(readProfile('prod')).rejects.toThrow(/isn't valid ipb data/);
  });

  it('removes the keychain item when the profile is deleted', async () => {
    await writeProfile('prod', { clientId: 'cid', apiKey: 'k3y', secretStore: 'keychain' });

    await deleteProfile('prod');

    expect(readKeychainSecret('profile:prod')).toBeNull();
  });

  it('removes keychain items for every credentials file it deletes', async () => {
    await writeCredentialsFile(defaultLocation.filename, { apiKey: 'a', secretStore: 'keychain' });
    await writeProfile('prod', { apiKey: 'b', secretStore: 'keychain' });
    // A same-named item for a file that keeps its own secrets is not ipb's to delete.
    await writeProfile('plain', { apiKey: 'c' });
    writeKeychainSecret('profile:plain', 'someone else');

    await deleteStoredCredentials([
      defaultLocation.filename,
      ipb('profiles', 'prod.json'),
      ipb('profiles', 'plain.json'),
    ]);

    expect(readKeychainSecret('default')).toBeNull();
    expect(readKeychainSecret('profile:prod')).toBeNull();
    expect(readKeychainSecret('profile:plain')).toBe('someone else');
  });
});
