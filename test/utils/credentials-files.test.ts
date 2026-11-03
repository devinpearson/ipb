/// <reference types="vitest" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Credentials } from '../../src/cmds/types';
import { CliError, ERROR_CODES } from '../../src/errors';
import {
  deleteProfile,
  deleteStoredCredentials,
  ensureCredentialsDirectory,
  getActiveProfile,
  listProfiles,
  listStoredCredentialPaths,
  loadCredentialsFile,
  loadProfile,
  readCredentialsFile,
  readCredentialsFileSync,
  readProfile,
  setActiveProfile,
  writeCredentialsFile,
  writeFileAtomic,
} from '../../src/utils/credentials-store';
import { readKeychainSecret, writeKeychainSecret } from '../../src/utils/os-keychain';

// The test setup gives this file a temp HOME and an in-memory keychain.
const ipb = (...parts: string[]) => path.join(os.homedir(), '.ipb', ...parts);
const location = { folder: ipb(), filename: ipb('.credentials.json') };
const isRoot = process.getuid?.() === 0;
const posixOnly = process.platform === 'win32' ? it.skip : it;

const EMPTY = {
  clientId: '',
  clientSecret: '',
  apiKey: '',
  cardKey: '',
  openaiKey: '',
  sandboxKey: '',
  mauHost: '',
  mauClientId: '',
  mauClientSecret: '',
  mauApiKey: '',
};

function write(file: string, content: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
}

const mode = (file: string) => fs.statSync(file).mode & 0o777;

function baseCredentials(): Credentials {
  return {
    host: 'h',
    apiKey: '',
    clientId: '',
    clientSecret: '',
    cardKey: '',
    openaiKey: '',
    sandboxKey: '',
    mauHost: '',
    mauClientId: '',
    mauClientSecret: '',
    mauApiKey: '',
  };
}

async function cliError(promise: Promise<unknown>): Promise<CliError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(CliError);
  return error as CliError;
}

afterEach(() => {
  fs.rmSync(ipb(), { recursive: true, force: true });
});

describe('readCredentialsFileSync', () => {
  it('returns empty credentials when there is no file', () => {
    expect(readCredentialsFileSync(location)).toEqual(EMPTY);
  });

  it('fills in missing fields with empty strings', () => {
    write(location.filename, { clientId: 'cid', host: 'x' });

    expect(readCredentialsFileSync(location)).toEqual({ ...EMPTY, clientId: 'cid', host: 'x' });
  });

  it('reports a broken file through onError and falls back to empty credentials', () => {
    write(location.filename, '{ nope');
    const onError = vi.fn();

    expect(readCredentialsFileSync(location, onError)).toEqual(EMPTY);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(SyntaxError);
  });

  it('does not throw on a broken file without onError', () => {
    write(location.filename, '{ nope');

    expect(readCredentialsFileSync(location)).toEqual(EMPTY);
  });
});

describe('readCredentialsFile', () => {
  it('returns empty credentials when there is no file', async () => {
    expect(await readCredentialsFile(location)).toEqual(EMPTY);
  });

  it('reads and fills in the file', async () => {
    write(location.filename, { apiKey: 'k' });

    expect(await readCredentialsFile(location)).toEqual({ ...EMPTY, apiKey: 'k' });
  });

  it('names the file when its JSON is broken', async () => {
    write(location.filename, '{ nope');

    const error = await cliError(readCredentialsFile(location));
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.message).toContain(
      `Failed to read credentials file: invalid JSON (${location.filename})`
    );
  });

  it('passes other read errors on with the reason', async () => {
    fs.mkdirSync(location.filename, { recursive: true });

    const error = await cliError(readCredentialsFile(location));
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.message).toMatch(/Failed to read credentials file: .*EISDIR/);
  });

  posixOnly.skipIf(isRoot)('reports an unreadable file as a permission problem', async () => {
    write(location.filename, { apiKey: 'k' });
    fs.chmodSync(location.filename, 0o000);

    const error = await cliError(readCredentialsFile(location));
    expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(error.message).toMatch(/Failed to read credentials file: .*EACCES/);
  });
});

describe('loadCredentialsFile', () => {
  const file = () => ipb('custom.json');

  it('leaves credentials alone when no file is given', async () => {
    const creds = baseCredentials();
    expect(await loadCredentialsFile(creds, '')).toBe(creds);
  });

  it('loads every known field', async () => {
    const all = {
      host: 'H',
      apiKey: 'A',
      clientId: 'C',
      clientSecret: 'S',
      openaiKey: 'O',
      sandboxKey: 'B',
      cardKey: 'K',
      mauHost: 'MH',
      mauClientId: 'MC',
      mauClientSecret: 'MS',
      mauApiKey: 'MA',
      readOnly: 'true',
    };
    write(file(), all);

    expect(await loadCredentialsFile(baseCredentials(), file())).toEqual(all);
  });

  it('reads credentials nested under "default"', async () => {
    write(file(), { default: { apiKey: 'nested' } });

    expect((await loadCredentialsFile(baseCredentials(), file())).apiKey).toBe('nested');
  });

  it('prefers top-level fields over a "default" block', async () => {
    write(file(), { clientId: 'top', default: { apiKey: 'nested' } });

    const loaded = await loadCredentialsFile(baseCredentials(), file());
    expect(loaded.clientId).toBe('top');
    expect(loaded.apiKey).toBe('');
  });

  it.each([null, ['apiKey'], 'text', 42])('ignores a %j "default" block', async (inner) => {
    write(file(), { default: inner });

    expect(await loadCredentialsFile(baseCredentials(), file())).toEqual(baseCredentials());
  });

  it.each([null, ['a'], 'text'])('ignores a file whose JSON is %j', async (content) => {
    write(file(), JSON.stringify(content));

    expect(await loadCredentialsFile(baseCredentials(), file())).toEqual(baseCredentials());
  });

  it('turns a boolean readOnly into a string but ignores other non-string values', async () => {
    write(file(), { readOnly: true, apiKey: true, clientId: 7 });

    const loaded = await loadCredentialsFile(baseCredentials(), file());
    expect(loaded.readOnly).toBe('true');
    expect(loaded.apiKey).toBe('');
    expect(loaded.clientId).toBe('');
  });

  it('ignores a non-boolean, non-string readOnly', async () => {
    write(file(), { readOnly: 1 });

    expect((await loadCredentialsFile(baseCredentials(), file())).readOnly).toBeUndefined();
  });

  it('names the missing file', async () => {
    const error = await cliError(loadCredentialsFile(baseCredentials(), file()));
    expect(error.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
    expect(error.message).toContain(`Failed to load credentials file: file not found (${file()})`);
  });

  it('names a file with broken JSON', async () => {
    write(file(), '{ nope');

    const error = await cliError(loadCredentialsFile(baseCredentials(), file()));
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.message).toContain(`invalid JSON (${file()})`);
  });
});

describe('ensureCredentialsDirectory', () => {
  posixOnly('creates the folder for the owner only', async () => {
    await ensureCredentialsDirectory({ folder: ipb('nested', 'dir') });

    expect(mode(ipb('nested', 'dir'))).toBe(0o700);
  });

  posixOnly('leaves an existing folder as it is', async () => {
    fs.mkdirSync(ipb(), { recursive: true, mode: 0o755 });
    fs.chmodSync(ipb(), 0o755);

    await ensureCredentialsDirectory({ folder: ipb() });

    expect(mode(ipb())).toBe(0o755);
  });
});

describe('writeFileAtomic', () => {
  posixOnly('writes with the requested permissions and leaves no temp file', async () => {
    await writeFileAtomic(ipb('a.json'), 'hello', { permissions: 0o600 });

    expect(fs.readFileSync(ipb('a.json'), 'utf8')).toBe('hello');
    expect(mode(ipb('a.json'))).toBe(0o600);
    expect(fs.readdirSync(ipb())).toEqual(['a.json']);
  });

  posixOnly('tightens permissions even when the umask would allow more', async () => {
    const previous = process.umask(0);
    try {
      await writeFileAtomic(ipb('a.json'), 'x', { permissions: 0o640 });
    } finally {
      process.umask(previous);
    }

    expect(mode(ipb('a.json'))).toBe(0o640);
  });

  posixOnly('uses normal file permissions when none are given', async () => {
    const previous = process.umask(0o022);
    try {
      await writeFileAtomic(ipb('a.json'), 'x');
    } finally {
      process.umask(previous);
    }

    expect(mode(ipb('a.json'))).toBe(0o644);
  });

  it('replaces an existing file', async () => {
    write(ipb('a.json'), 'old');

    await writeFileAtomic(ipb('a.json'), 'new');

    expect(fs.readFileSync(ipb('a.json'), 'utf8')).toBe('new');
  });

  it('removes its temp file when the final rename fails', async () => {
    fs.mkdirSync(ipb('target', 'inside'), { recursive: true });

    await expect(writeFileAtomic(ipb('target'), 'x')).rejects.toThrow();

    expect(fs.readdirSync(ipb()).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });
});

describe('writeCredentialsFile', () => {
  posixOnly('writes pretty JSON readable only by the owner', async () => {
    await writeCredentialsFile(location.filename, { apiKey: 'k' });

    expect(fs.readFileSync(location.filename, 'utf8')).toBe(
      JSON.stringify({ apiKey: 'k' }, null, 2)
    );
    expect(mode(location.filename)).toBe(0o600);
  });
});

describe('profiles', () => {
  it('lists no profiles when there is no profiles folder', async () => {
    expect(await listProfiles()).toEqual([]);
  });

  it('lists profile names in order, ignoring other files', async () => {
    write(ipb('profiles', 'staging.json'), {});
    write(ipb('profiles', 'prod.json'), {});
    write(ipb('profiles', 'notes.txt'), 'x');

    expect(await listProfiles()).toEqual(['prod', 'staging']);
  });

  it('lists no profiles when the profiles path is not a folder', async () => {
    write(ipb('profiles'), 'not a folder');

    expect(await listProfiles()).toEqual([]);
  });

  it('explains how to list profiles when one is missing', async () => {
    const error = await cliError(readProfile('nope'));
    expect(error.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
    expect(error.message).toContain(
      `Profile "nope" does not exist. Use 'ipb config profile list' to see available profiles.`
    );
  });

  it('names a profile with broken JSON', async () => {
    write(ipb('profiles', 'prod.json'), '{ nope');

    const error = await cliError(readProfile('prod'));
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.message).toContain('Failed to read profile "prod": ');
  });

  it('fills in a profile with empty fields', async () => {
    write(ipb('profiles', 'prod.json'), { apiKey: 'k' });

    expect(await readProfile('prod')).toEqual({ ...EMPTY, apiKey: 'k' });
  });

  it('refuses to delete a profile that does not exist', async () => {
    const error = await cliError(deleteProfile('nope'));
    expect(error.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
    expect(error.message).toContain('Profile "nope" does not exist.');
  });

  it('reports a profile it could not delete', async () => {
    fs.mkdirSync(ipb('profiles', 'prod.json'), { recursive: true });

    const error = await cliError(deleteProfile('prod'));
    expect(error.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
    expect(error.message).toContain('Failed to delete profile "prod": ');
  });

  it('deletes a profile', async () => {
    write(ipb('profiles', 'prod.json'), {});

    await deleteProfile('prod');

    expect(fs.existsSync(ipb('profiles', 'prod.json'))).toBe(false);
  });
});

describe('loadProfile', () => {
  it('returns the credentials unchanged without a profile name', async () => {
    const creds = baseCredentials();
    expect(await loadProfile(creds)).toBe(creds);
  });

  it('layers the profile over the credentials', async () => {
    write(ipb('profiles', 'prod.json'), { apiKey: 'p' });

    const loaded = await loadProfile({ ...baseCredentials(), host: 'kept' }, 'prod');
    expect(loaded).toMatchObject({ host: 'kept', apiKey: 'p', clientId: '' });
  });

  it('fails for a missing profile', async () => {
    const error = await cliError(loadProfile(baseCredentials(), 'nope'));
    expect(error.code).toBe(ERROR_CODES.FILE_NOT_FOUND);
  });

  it('fails for a broken profile', async () => {
    write(ipb('profiles', 'prod.json'), '{ nope');

    const error = await cliError(loadProfile(baseCredentials(), 'prod'));
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
  });
});

describe('active profile', () => {
  it('is null when none is set', async () => {
    expect(await getActiveProfile()).toBeNull();
  });

  it('is saved, read back and cleared', async () => {
    await setActiveProfile('prod');
    expect(JSON.parse(fs.readFileSync(ipb('active-profile.json'), 'utf8'))).toEqual({
      profile: 'prod',
    });
    expect(await getActiveProfile()).toBe('prod');

    await setActiveProfile(null);
    expect(fs.existsSync(ipb('active-profile.json'))).toBe(false);
    expect(await getActiveProfile()).toBeNull();
  });

  posixOnly('is saved readable only by the owner', async () => {
    await setActiveProfile('prod');

    expect(mode(ipb('active-profile.json'))).toBe(0o600);
  });

  it('clearing it when none is set is fine', async () => {
    await expect(setActiveProfile(null)).resolves.toBeUndefined();
  });

  it.each([['{ nope'], [JSON.stringify({ profile: '' })], [JSON.stringify({})]])(
    'is null for an unusable setting %s',
    async (content) => {
      write(ipb('active-profile.json'), content);

      expect(await getActiveProfile()).toBeNull();
    }
  );
});

describe('stored credential files', () => {
  it('finds nothing when nothing is stored', () => {
    expect(listStoredCredentialPaths(true)).toEqual([]);
  });

  it('lists the default file, then profiles and the active profile with --all', () => {
    write(location.filename, {});
    write(ipb('profiles', 'prod.json'), {});
    write(ipb('profiles', 'notes.txt'), 'x');
    write(ipb('active-profile.json'), { profile: 'prod' });

    expect(listStoredCredentialPaths(false)).toEqual([location.filename]);
    expect(listStoredCredentialPaths(true)).toEqual([
      location.filename,
      ipb('profiles', 'prod.json'),
      ipb('active-profile.json'),
    ]);
  });

  it('reports a file it could not delete', async () => {
    fs.mkdirSync(ipb('stuck.json'), { recursive: true });

    const error = await cliError(deleteStoredCredentials([ipb('stuck.json')]));
    expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(error.message).toContain(`Failed to delete ${ipb('stuck.json')}: `);
  });

  it('only removes keychain items for ipb credential files', async () => {
    writeKeychainSecret('default', 'keep');
    writeKeychainSecret('profile:custom', 'keep too');
    // Same contents as a keychain-backed credentials file, but outside the places ipb owns.
    write(ipb('custom.json'), { secretStore: 'keychain' });
    write(path.join(os.tmpdir(), 'ipb-elsewhere', 'custom.json'), { secretStore: 'keychain' });

    await deleteStoredCredentials([
      ipb('custom.json'),
      path.join(os.tmpdir(), 'ipb-elsewhere', 'custom.json'),
    ]);

    expect(readKeychainSecret('default')).toBe('keep');
    expect(readKeychainSecret('profile:custom')).toBe('keep too');
    fs.rmSync(path.join(os.tmpdir(), 'ipb-elsewhere'), { recursive: true, force: true });
  });

  it('still deletes a broken file without touching the keychain', async () => {
    writeKeychainSecret('default', 'keep');
    write(location.filename, '{ nope');

    await deleteStoredCredentials([location.filename]);

    expect(fs.existsSync(location.filename)).toBe(false);
    expect(readKeychainSecret('default')).toBe('keep');
  });
});
