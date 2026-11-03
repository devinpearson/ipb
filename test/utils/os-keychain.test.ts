/// <reference types="vitest" />

import os from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The shared setup swaps this module for an in-memory keychain; test the real one,
// with spawnSync mocked so nothing touches the OS keychain.
vi.unmock('../../src/utils/os-keychain.js');

const spawnSync = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ spawnSync }));

const { deleteKeychainSecret, isKeychainSupported, readKeychainSecret, writeKeychainSecret } =
  await import('../../src/utils/os-keychain');

const originalPlatform = process.platform;
function onPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  spawnSync.mockReset();
});

const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });

describe('macOS Keychain', () => {
  it('writes through `security -i` so the secret is not in the argument list', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue(ok());

    writeKeychainSecret('default', '{"apiKey":"s3cret"}');

    const [command, args, options] = spawnSync.mock.calls[0];
    expect(command).toBe('security');
    expect(args).toEqual(['-i']);
    expect(JSON.stringify(args)).not.toContain('s3cret');
    expect(options.input).toContain(Buffer.from('{"apiKey":"s3cret"}').toString('hex'));
    expect(options.input).not.toContain('s3cret');
    expect(options.env.HOME).toBe(os.userInfo().homedir);
  });

  it('reads a secret and treats exit 44 as not found', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValueOnce(ok('{"apiKey":"k"}\n'));
    expect(readKeychainSecret('profile:prod')).toBe('{"apiKey":"k"}');
    expect(spawnSync.mock.calls[0][1]).toEqual([
      'find-generic-password',
      '-s',
      'investec-ipb',
      '-a',
      'profile:prod',
      '-w',
    ]);

    spawnSync.mockReturnValueOnce({ status: 44, stdout: '', stderr: 'not found' });
    expect(readKeychainSecret('default')).toBeNull();
  });

  it('reports a failed write, even when `security -i` exits 0', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: 'add-generic-password: returned -60006',
    });

    expect(() => writeKeychainSecret('default', 'x')).toThrow(/-60006/);
  });

  it('ignores deleting an item that is not there', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue({ status: 44, stdout: '', stderr: '' });

    expect(() => deleteKeychainSecret('default')).not.toThrow();
  });
});

describe('Linux keyring', () => {
  it('passes the secret to secret-tool on stdin', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue(ok());

    writeKeychainSecret('default', 's3cret');

    const [command, args, options] = spawnSync.mock.calls[0];
    expect(command).toBe('secret-tool');
    expect(args).not.toContain('s3cret');
    expect(options.input).toBe('s3cret');
  });

  it('treats a silent exit 1 as not found', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: '' });

    expect(readKeychainSecret('default')).toBeNull();
  });

  it('explains how to install secret-tool when it is missing', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue({
      error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }),
    });

    expect(() => readKeychainSecret('default')).toThrow(/libsecret-tools/);
  });
});

describe('everywhere', () => {
  it('rejects account names that could inject `security -i` commands', () => {
    onPlatform('darwin');
    expect(() => writeKeychainSecret('x\ndelete-keychain', 'v')).toThrow(
      /Invalid keychain account/
    );
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('refuses on platforms without a backend', () => {
    onPlatform('win32');
    expect(() => readKeychainSecret('default')).toThrow(/isn't supported on win32/);
  });
});

const failed = (status: number, stderr: string) => ({
  status,
  stdout: '',
  stderr: `  ${stderr}\n`,
});

describe('exact commands', () => {
  it('runs the macOS commands with the real home, utf8 and a timeout', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue(ok('v\n'));

    readKeychainSecret('default');
    writeKeychainSecret('default', 'v');
    deleteKeychainSecret('default');

    const [read, write, remove] = spawnSync.mock.calls;
    expect(read?.[1]).toEqual([
      'find-generic-password',
      '-s',
      'investec-ipb',
      '-a',
      'default',
      '-w',
    ]);
    expect(write?.[2].input).toBe(
      `add-generic-password -U -s investec-ipb -a default -l "Investec ipb (default)" -X ${Buffer.from('v').toString('hex')}\n`
    );
    expect(remove?.[0]).toBe('security');
    expect(remove?.[1]).toEqual(['delete-generic-password', '-s', 'investec-ipb', '-a', 'default']);
    for (const call of spawnSync.mock.calls) {
      expect(call[2]).toMatchObject({ encoding: 'utf8', timeout: 30_000 });
      expect(call[2].env.HOME).toBe(os.userInfo().homedir);
    }
  });

  it('runs the Linux commands with the normal environment', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue(ok('v'));

    readKeychainSecret('profile:prod');
    writeKeychainSecret('profile:prod', 'v');
    deleteKeychainSecret('profile:prod');

    expect(spawnSync.mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ['secret-tool', ['lookup', 'service', 'investec-ipb', 'account', 'profile:prod']],
      [
        'secret-tool',
        [
          'store',
          '--label',
          'Investec ipb (profile:prod)',
          'service',
          'investec-ipb',
          'account',
          'profile:prod',
        ],
      ],
      ['secret-tool', ['clear', 'service', 'investec-ipb', 'account', 'profile:prod']],
    ]);
    for (const call of spawnSync.mock.calls) {
      expect(call[2]).toMatchObject({ encoding: 'utf8', timeout: 30_000 });
      expect(call[2].env).toBe(process.env);
    }
  });

  it('keeps a value as stored apart from the trailing newline `security -w` adds', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue(ok('line one\nline two\n'));

    expect(readKeychainSecret('default')).toBe('line one\nline two');
  });

  it('returns a Linux value exactly as stored', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue(ok('value\n'));

    expect(readKeychainSecret('default')).toBe('value\n');
  });

  it('encodes non-ASCII secrets as UTF-8 hex', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue(ok());

    writeKeychainSecret('default', 'pässwörd');

    expect(spawnSync.mock.calls[0]?.[2].input).toContain(
      Buffer.from('pässwörd', 'utf8').toString('hex')
    );
  });
});

describe('failures', () => {
  it.each([
    ['darwin', 'read', 'Could not read from the macOS Keychain: locked'],
    ['linux', 'read', 'Could not read from the keyring: locked'],
    ['darwin', 'write', 'Could not write to the macOS Keychain: locked'],
    ['linux', 'write', 'Could not write to the keyring: locked'],
    ['darwin', 'delete', 'Could not delete from the macOS Keychain: locked'],
    ['linux', 'delete', 'Could not delete from the keyring: locked'],
  ] as const)('%s %s reports the trimmed reason', (platform, op, message) => {
    onPlatform(platform);
    spawnSync.mockReturnValue(failed(1, 'locked'));
    const action = {
      read: () => readKeychainSecret('default'),
      write: () => writeKeychainSecret('default', 'v'),
      delete: () => deleteKeychainSecret('default'),
    }[op];

    expect(action).toThrow(`Error (E4023): ${message}`);
  });

  it.each(['darwin', 'linux'] as const)(
    '%s write without a reason reports the exit status',
    (platform) => {
      onPlatform(platform);
      spawnSync.mockReturnValue({ status: 3, stdout: '', stderr: ' \n' });

      expect(() => writeKeychainSecret('default', 'v')).toThrow(/: exit 3$/);
    }
  );

  it('accepts a macOS write that succeeds quietly', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '\n' });

    expect(() => writeKeychainSecret('default', 'v')).not.toThrow();
  });

  it('accepts a Linux write or delete that succeeds', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: 'warning' });

    expect(() => writeKeychainSecret('default', 'v')).not.toThrow();
    expect(() => deleteKeychainSecret('default')).not.toThrow();
  });

  it('treats a silent Linux delete failure as already gone', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: '\n' });

    expect(() => deleteKeychainSecret('default')).not.toThrow();
  });

  it('treats a whitespace-only Linux lookup error as not found', () => {
    onPlatform('linux');
    spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: ' \n' });

    expect(readKeychainSecret('default')).toBeNull();
  });

  it('reports a missing security tool and other spawn errors', () => {
    onPlatform('darwin');
    spawnSync.mockReturnValueOnce({ error: Object.assign(new Error('nope'), { code: 'ENOENT' }) });
    expect(() => readKeychainSecret('default')).toThrow('Error (E4023): security was not found.');

    spawnSync.mockReturnValueOnce({
      error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }),
    });
    expect(() => readKeychainSecret('default')).toThrow(
      'Error (E4023): security failed: timed out'
    );
  });

  it.each([
    ['read', () => readKeychainSecret('bad name')],
    ['write', () => writeKeychainSecret('bad name', 'v')],
    ['delete', () => deleteKeychainSecret('bad name')],
  ])('%s checks the account name first', (_op, action) => {
    onPlatform('darwin');

    expect(action).toThrow('Invalid keychain account name "bad name".');
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([
    ['read', () => readKeychainSecret('default')],
    ['write', () => writeKeychainSecret('default', 'v')],
    ['delete', () => deleteKeychainSecret('default')],
  ])('%s refuses on Windows without running anything', (_op, action) => {
    onPlatform('win32');

    expect(action).toThrow(
      "Error (E4023): The OS keychain isn't supported on win32 yet. Keep secrets in the credentials file (ipb config --no-keychain)."
    );
    expect(spawnSync).not.toHaveBeenCalled();
  });
});

describe('isKeychainSupported', () => {
  it.each([
    ['darwin', true],
    ['linux', true],
    ['win32', false],
    ['freebsd', false],
  ] as const)('%s → %s', (platform, supported) => {
    onPlatform(platform);
    expect(isKeychainSupported()).toBe(supported);
  });
});
