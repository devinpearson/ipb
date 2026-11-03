/// <reference types="vitest" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  finalizeProfileDeletion,
  runConfigDelete,
  runConfigEdit,
  runConfigProfileList,
  runConfigProfileSet,
} from '../../src/cmds/config-subcommands';
import { CliError, ERROR_CODES } from '../../src/errors';
import { setInteractive } from '../helpers/tty';

const mockConfirm = vi.hoisted(() => vi.fn());
vi.mock('@inquirer/prompts', () => ({ confirm: mockConfirm }));

const openInEditor = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../../src/utils/interaction.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  openInEditor,
}));

// The test setup gives this file a temp HOME and an in-memory keychain.
const ipb = (...parts: string[]) => path.join(os.homedir(), '.ipb', ...parts);
let restoreTty: () => void = () => {};
let log: ReturnType<typeof vi.spyOn>;
const printed = () => log.mock.calls.map((call) => call.join(' '));

function write(file: string, content: object) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(content));
}

beforeEach(() => {
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
  mockConfirm.mockReset();
});

afterEach(() => {
  restoreTty();
  restoreTty = () => {};
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fs.rmSync(ipb(), { recursive: true, force: true });
});

describe('profile list', () => {
  it('marks only the active profile', async () => {
    write(ipb('profiles', 'prod.json'), {});
    write(ipb('profiles', 'staging.json'), {});
    write(ipb('active-profile.json'), { profile: 'staging' });

    await runConfigProfileList();

    expect(printed()).toEqual(['Available profiles:', '  - prod', '  - staging (active)']);
  });
});

describe('profile set', () => {
  it('confirms the new active profile', async () => {
    write(ipb('profiles', 'prod.json'), {});

    await runConfigProfileSet('prod');

    expect(printed()).toEqual([expect.stringContaining('Active profile set to: prod')]);
  });

  it('explains how to create a missing profile', async () => {
    const error = await runConfigProfileSet('nope').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe(ERROR_CODES.FILE_NOT_FOUND);
    expect((error as CliError).message).toContain(
      'Profile "nope" does not exist. Create it first with: ipb config --profile nope --client-id <id> --client-secret <secret> --api-key <key>'
    );
    expect(fs.existsSync(ipb('active-profile.json'))).toBe(false);
  });

  it('passes other problems through unchanged', async () => {
    fs.mkdirSync(ipb('profiles'), { recursive: true });
    fs.writeFileSync(ipb('profiles', 'prod.json'), '{ nope');

    const error = await runConfigProfileSet('prod').catch((e: unknown) => e);

    expect((error as CliError).code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect((error as CliError).message).toContain('Failed to read profile "prod"');
  });
});

describe('finalizeProfileDeletion', () => {
  it('clears the active profile when it was the one deleted', async () => {
    write(ipb('active-profile.json'), { profile: 'prod' });

    await finalizeProfileDeletion('prod');

    expect(fs.existsSync(ipb('active-profile.json'))).toBe(false);
    expect(printed()).toEqual([
      expect.stringContaining('Profile "prod" deleted and cleared from active profile.'),
    ]);
  });

  it('keeps another active profile', async () => {
    write(ipb('active-profile.json'), { profile: 'staging' });

    await finalizeProfileDeletion('prod');

    expect(fs.existsSync(ipb('active-profile.json'))).toBe(true);
    expect(printed()).toEqual([expect.stringMatching(/Profile "prod" deleted\.$/)]);
  });
});

describe('config delete output', () => {
  it('says there is nothing to delete, with or without --all', async () => {
    await runConfigDelete({});
    await runConfigDelete({ all: true });

    expect(printed()).toEqual([
      'No stored credentials to delete.',
      'No stored credentials or profiles to delete.',
    ]);
  });

  it('lists the files, asks a clear question and reports the count', async () => {
    restoreTty = setInteractive(true);
    write(ipb('.credentials.json'), {});
    write(ipb('profiles', 'prod.json'), {});
    mockConfirm.mockResolvedValueOnce(true);

    await runConfigDelete({ all: true });

    expect(mockConfirm).toHaveBeenCalledWith({
      message: 'Delete these files? Your saved API keys will be gone.',
      default: false,
    });
    expect(printed()).toEqual([
      'This will delete:',
      `  ${ipb('.credentials.json')}`,
      `  ${ipb('profiles', 'prod.json')}`,
      expect.stringContaining('Deleted 2 file(s).'),
    ]);
  });

  it.each([
    ['INVESTEC_CLIENT_ID', 'c'],
    ['INVESTEC_API_KEY', 'k'],
  ])('warns that %s still applies after deleting', async (name, value) => {
    vi.stubEnv(name, value);
    write(ipb('.credentials.json'), {});

    await runConfigDelete({ yes: true });

    expect(printed().at(-1)).toBe('Credentials from INVESTEC_* environment variables still apply.');
  });

  it('does not warn when no INVESTEC_* credentials are set', async () => {
    vi.stubEnv('INVESTEC_CLIENT_ID', '');
    vi.stubEnv('INVESTEC_API_KEY', '');
    write(ipb('.credentials.json'), {});

    await runConfigDelete({ yes: true });

    expect(printed().at(-1)).toMatch(/Deleted 1 file\(s\)\./);
  });

  it('needs both stdin and stdout to be a terminal to ask', async () => {
    restoreTty = setInteractive(true);
    process.stdout.isTTY = false;
    write(ipb('.credentials.json'), {});

    await expect(runConfigDelete({})).rejects.toThrow(/Re-run with --yes/);
  });

  it('explains why read-only mode needs a terminal even with --yes', async () => {
    write(ipb('.credentials.json'), { readOnly: true });

    await expect(runConfigDelete({ yes: true })).rejects.toThrow(
      'Read-only mode is on, so deleting stored credentials needs an interactive terminal (even with --yes).'
    );
  });

  it('treats an unreadable file as not turning on read-only mode', async () => {
    fs.mkdirSync(ipb(), { recursive: true });
    fs.writeFileSync(ipb('.credentials.json'), '{ nope');

    await runConfigDelete({ yes: true });

    expect(fs.existsSync(ipb('.credentials.json'))).toBe(false);
  });
});

describe('config edit', () => {
  it('names the file and editor, opens it and confirms', async () => {
    vi.stubEnv('EDITOR', 'vim');

    await runConfigEdit({ defaultCredentialsFile: '/x/.credentials.json' });

    expect(openInEditor).toHaveBeenCalledWith('/x/.credentials.json');
    expect(printed()).toEqual([
      'Opening /x/.credentials.json in vim...',
      expect.stringContaining('Credentials file saved'),
    ]);
  });

  it('falls back to "default editor" and opens a profile file', async () => {
    vi.stubEnv('EDITOR', '');

    await runConfigEdit({ profile: 'prod', defaultCredentialsFile: '/x' });

    expect(printed()[0]).toBe(`Opening ${ipb('profiles', 'prod.json')} in default editor...`);
  });
});
