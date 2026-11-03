import { spawnSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { CliError, ERROR_CODES } from '../errors.js';

/** Keychain service name; each credential set is one item, keyed by account (e.g. "default"). */
const KEYCHAIN_SERVICE = 'investec-ipb';

/** macOS `security` exit status for "item not found". */
const MAC_NOT_FOUND = 44;

function fail(message: string): never {
  throw new CliError(ERROR_CODES.SECRET_STORE_ERROR, message);
}

function checkAccount(account: string): void {
  // Account names go into a `security -i` command line, so keep them to safe characters.
  if (!/^[\w.:-]+$/.test(account)) {
    fail(`Invalid keychain account name "${account}".`);
  }
}

function run(command: string, args: string[], input?: string) {
  // `security` finds the login keychain through HOME; the keychain belongs to the OS user,
  // so use their real home even when HOME has been pointed elsewhere.
  const env = command === 'security' ? { ...process.env, HOME: userInfo().homedir } : process.env;
  const result = spawnSync(command, args, { input, env, encoding: 'utf8', timeout: 30_000 });
  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      fail(
        command === 'secret-tool'
          ? 'secret-tool was not found. Install libsecret-tools (e.g. `sudo apt install libsecret-tools`) and make sure a keyring such as GNOME Keyring is running.'
          : `${command} was not found.`
      );
    }
    fail(`${command} failed: ${result.error.message}`);
  }
  return result;
}

function unsupported(): never {
  fail(
    `The OS keychain isn't supported on ${process.platform} yet. Keep secrets in the credentials file (ipb config --no-keychain).`
  );
}

/** Whether this platform has a keychain backend. */
export function isKeychainSupported(): boolean {
  return process.platform === 'darwin' || process.platform === 'linux';
}

/**
 * Reads a secret from the OS keychain.
 * @returns The stored value, or null when there is no such item
 */
export function readKeychainSecret(account: string): string | null {
  checkAccount(account);
  if (process.platform === 'darwin') {
    const result = run('security', [
      'find-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      account,
      '-w',
    ]);
    if (result.status === MAC_NOT_FOUND) return null;
    if (result.status !== 0)
      fail(`Could not read from the macOS Keychain: ${result.stderr.trim()}`);
    return result.stdout.replace(/\n$/, '');
  }
  if (process.platform === 'linux') {
    const result = run('secret-tool', ['lookup', 'service', KEYCHAIN_SERVICE, 'account', account]);
    if (result.status !== 0) {
      // secret-tool exits 1 with no output when the item doesn't exist.
      if (!result.stderr.trim()) return null;
      fail(`Could not read from the keyring: ${result.stderr.trim()}`);
    }
    return result.stdout;
  }
  return unsupported();
}

/** Stores (or replaces) a secret in the OS keychain. The value never appears in a process argument list. */
export function writeKeychainSecret(account: string, value: string): void {
  checkAccount(account);
  if (process.platform === 'darwin') {
    const hex = Buffer.from(value, 'utf8').toString('hex');
    // `security -i` reads the command from stdin, so the secret isn't visible in `ps`.
    const result = run(
      'security',
      ['-i'],
      `add-generic-password -U -s ${KEYCHAIN_SERVICE} -a ${account} -l "Investec ipb (${account})" -X ${hex}\n`
    );
    if (result.status !== 0 || result.stderr.trim()) {
      fail(
        `Could not write to the macOS Keychain: ${result.stderr.trim() || `exit ${result.status}`}`
      );
    }
    return;
  }
  if (process.platform === 'linux') {
    const result = run(
      'secret-tool',
      [
        'store',
        '--label',
        `Investec ipb (${account})`,
        'service',
        KEYCHAIN_SERVICE,
        'account',
        account,
      ],
      value
    );
    if (result.status !== 0) {
      fail(`Could not write to the keyring: ${result.stderr.trim() || `exit ${result.status}`}`);
    }
    return;
  }
  unsupported();
}

/** Removes a secret from the OS keychain. Missing items are ignored. */
export function deleteKeychainSecret(account: string): void {
  checkAccount(account);
  if (process.platform === 'darwin') {
    const result = run('security', [
      'delete-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      account,
    ]);
    if (result.status !== 0 && result.status !== MAC_NOT_FOUND) {
      fail(`Could not delete from the macOS Keychain: ${result.stderr.trim()}`);
    }
    return;
  }
  if (process.platform === 'linux') {
    const result = run('secret-tool', ['clear', 'service', KEYCHAIN_SERVICE, 'account', account]);
    if (result.status !== 0 && result.stderr.trim()) {
      fail(`Could not delete from the keyring: ${result.stderr.trim()}`);
    }
    return;
  }
  unsupported();
}
