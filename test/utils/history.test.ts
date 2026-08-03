/// <reference types="vitest" />

import { mkdtemp, rm } from 'node:fs/promises';
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
  it('redacts sensitive key=value args case-insensitively, including short values', async () => {
    await logCommandHistory(
      'bank',
      ['API_KEY=abc', '--client-secret=supersecretvalue', '--safe-flag=value'],
      {},
      0
    );

    const history = readCommandHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.args).toEqual([
      'API_KEY=***',
      '--client-secret=supe***alue',
      '--safe-flag=value',
    ]);
  });

  it('redacts standalone sensitive args and leaves benign args unchanged', async () => {
    await logCommandHistory('bank', ['token', 'merchant-name', 'PASSWORD'], {}, 0);

    const history = readCommandHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.args).toEqual(['***', 'merchant-name', '***']);
  });
});
