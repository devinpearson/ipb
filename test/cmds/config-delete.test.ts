/// <reference types="vitest" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runConfigDelete } from '../../src/cmds/config-subcommands';
import { CliError, ERROR_CODES } from '../../src/errors';
import { setInteractive } from '../helpers/tty';

const mockConfirm = vi.hoisted(() => vi.fn());
vi.mock('@inquirer/prompts', () => ({ confirm: mockConfirm }));

let home: string;
let originalHome: string | undefined;
let restoreTty: () => void = () => {};

const ipb = (...parts: string[]) => path.join(home, '.ipb', ...parts);

function writeJson(filePath: string, data: object) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

beforeEach(() => {
  originalHome = process.env.HOME;
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'ipb-config-delete-'));
  process.env.HOME = home;
  mockConfirm.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  writeJson(ipb('.credentials.json'), { clientId: 'c', apiKey: 'k' });
  writeJson(ipb('profiles', 'prod.json'), { clientId: 'p' });
  writeJson(ipb('active-profile.json'), { profile: 'prod' });
});

afterEach(() => {
  restoreTty();
  restoreTty = () => {};
  process.env.HOME = originalHome;
  delete process.env.IPB_READ_ONLY;
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});

describe('ipb config delete', () => {
  it('deletes only the default credentials file after confirmation', async () => {
    restoreTty = setInteractive(true);
    mockConfirm.mockResolvedValueOnce(true);

    await runConfigDelete({});

    expect(fs.existsSync(ipb('.credentials.json'))).toBe(false);
    expect(fs.existsSync(ipb('profiles', 'prod.json'))).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ default: false }));
  });

  it('--all also deletes profiles and the active profile setting', async () => {
    await runConfigDelete({ all: true, yes: true });

    expect(fs.existsSync(ipb('.credentials.json'))).toBe(false);
    expect(fs.existsSync(ipb('profiles', 'prod.json'))).toBe(false);
    expect(fs.existsSync(ipb('active-profile.json'))).toBe(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('keeps everything when the confirmation is declined', async () => {
    restoreTty = setInteractive(true);
    mockConfirm.mockResolvedValueOnce(false);

    await runConfigDelete({ all: true });

    expect(fs.existsSync(ipb('.credentials.json'))).toBe(true);
    expect(fs.existsSync(ipb('profiles', 'prod.json'))).toBe(true);
    expect(console.log).toHaveBeenCalledWith('Nothing deleted.');
  });

  it('needs --yes without a terminal', async () => {
    restoreTty = setInteractive(false);

    await expect(runConfigDelete({})).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof CliError &&
        err.code === ERROR_CODES.INVALID_INPUT &&
        err.message.includes('--yes')
    );
    expect(fs.existsSync(ipb('.credentials.json'))).toBe(true);
  });

  it('says so when there is nothing to delete', async () => {
    fs.rmSync(path.join(home, '.ipb'), { recursive: true });
    await runConfigDelete({ yes: true });
    expect(console.log).toHaveBeenCalledWith('No stored credentials to delete.');
  });

  describe('while read-only mode is on', () => {
    beforeEach(() => {
      writeJson(ipb('.credentials.json'), { clientId: 'c', readOnly: 'true' });
    });

    it('refuses without a terminal, even with --yes', async () => {
      restoreTty = setInteractive(false);

      await expect(runConfigDelete({ yes: true })).rejects.toSatisfy(
        (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.READ_ONLY
      );
      expect(fs.existsSync(ipb('.credentials.json'))).toBe(true);
    });

    it('still asks for confirmation in a terminal when --yes is passed', async () => {
      restoreTty = setInteractive(true);
      mockConfirm.mockResolvedValueOnce(false);

      await runConfigDelete({ yes: true });

      expect(mockConfirm).toHaveBeenCalled();
      expect(fs.existsSync(ipb('.credentials.json'))).toBe(true);
    });

    it('also applies when a profile being deleted is the read-only one', async () => {
      writeJson(ipb('.credentials.json'), { clientId: 'c' });
      writeJson(ipb('profiles', 'agent.json'), { readOnly: true });
      restoreTty = setInteractive(false);

      await expect(runConfigDelete({ all: true, yes: true })).rejects.toSatisfy(
        (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.READ_ONLY
      );
    });

    it('applies when IPB_READ_ONLY is set', async () => {
      writeJson(ipb('.credentials.json'), { clientId: 'c' });
      process.env.IPB_READ_ONLY = '1';
      restoreTty = setInteractive(false);

      await expect(runConfigDelete({ yes: true })).rejects.toSatisfy(
        (err: unknown) => err instanceof CliError && err.code === ERROR_CODES.READ_ONLY
      );
    });
  });
});
