/// <reference types="vitest" />

import { chmod, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { logCommandHistory, readCommandHistory } from '../../src/utils/history.js';

let tempHome: string;
let originalHome: string | undefined;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tempHome = await mkdtemp(path.join(os.tmpdir(), 'ipb-history-test-'));
  process.env.HOME = tempHome;
});

afterEach(async () => {
  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
  await rm(tempHome, { recursive: true, force: true });
});

describe('history sanitization', () => {
  it('fully masks the value after a sensitive flag, whatever the value looks like', async () => {
    await logCommandHistory(
      'config',
      [
        '--client-id',
        'abc123',
        '--client-secret',
        'fake-secret-value',
        '--api-key',
        'Zx9',
        '--host',
        'h',
      ],
      {},
      0
    );

    expect(readCommandHistory()[0]?.args).toEqual([
      '--client-id',
      '***',
      '--client-secret',
      '***',
      '--api-key',
      '***',
      '--host',
      'h',
    ]);
  });

  it('masks key=value args case-insensitively, including short values', async () => {
    await logCommandHistory(
      'bank',
      ['API_KEY=abc', '--client-secret=supersecretvalue', '--safe-flag=value'],
      {},
      0
    );

    expect(readCommandHistory()[0]?.args).toEqual([
      'API_KEY=***',
      '--client-secret=***',
      '--safe-flag=value',
    ]);
  });

  it('keeps ordinary args, and a flag that follows a sensitive flag with no value', async () => {
    await logCommandHistory('pay', ['acc-1', 'token', '--card-key', '--verbose', 'rent'], {}, 0);

    expect(readCommandHistory()[0]?.args).toEqual([
      'acc-1',
      'token',
      '--card-key',
      '--verbose',
      'rent',
    ]);
  });

  it('masks sensitive option values but keeps booleans', async () => {
    await logCommandHistory('accounts', [], { apiKey: 'Zx9', clientSecret: true, json: true }, 0);

    expect(readCommandHistory()[0]?.options).toEqual({
      apiKey: '***',
      clientSecret: true,
      json: true,
    });
  });

  it('scrubs secrets that earlier versions left in the history file', async () => {
    const ipbDir = path.join(tempHome, '.ipb');
    await mkdir(ipbDir, { recursive: true });
    await writeFile(
      path.join(ipbDir, 'history.json'),
      JSON.stringify([
        {
          timestamp: 1,
          command: 'config',
          args: ['--cl***cret', 'fake-secret-value', '--api-key', 'SUPE***5678'],
          options: { apiKey: 'APIK***9012' },
          exitCode: 0,
        },
      ])
    );

    await logCommandHistory('accounts', [], {}, 0);

    const [old] = readCommandHistory();
    expect(old?.args).toEqual(['--cl***cret', '***', '--api-key', '***']);
    expect(old?.options).toEqual({ apiKey: '***' });
  });
});

describe('history writes', () => {
  it('leaves no temp files behind', async () => {
    await logCommandHistory('accounts', [], {}, 0);
    await logCommandHistory('cards', [], {}, 0);

    expect(await readdir(path.join(tempHome, '.ipb'))).toEqual(['history.json']);
    expect(readCommandHistory().map((entry) => entry.command)).toEqual(['accounts', 'cards']);
  });
});

describe.skipIf(process.platform === 'win32')('history file permissions', () => {
  it('writes history as owner-only and tightens an existing ~/.ipb directory', async () => {
    const ipbDir = path.join(tempHome, '.ipb');
    await mkdir(ipbDir, { mode: 0o755 });
    await chmod(ipbDir, 0o755);

    await logCommandHistory('pay', ['acc-1', 'benef-1', '100.00', 'rent'], {}, 0);

    expect((await stat(path.join(ipbDir, 'history.json'))).mode & 0o777).toBe(0o600);
    expect((await stat(ipbDir)).mode & 0o777).toBe(0o700);
  });
});
