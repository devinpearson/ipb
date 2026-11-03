/// <reference types="vitest" />

import os from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The shared setup swaps this module for an in-memory keychain; test the real one,
// with spawnSync mocked so nothing touches the OS keychain.
vi.unmock('../../src/utils/os-keychain.js');

const spawnSync = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ spawnSync }));

const { deleteKeychainSecret, readKeychainSecret, writeKeychainSecret } = await import(
  '../../src/utils/os-keychain'
);

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
