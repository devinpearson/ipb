import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

describe('test home isolation', () => {
  const originalHome = process.env.HOME;

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  it('never resolves to the real home folder', () => {
    expect(os.homedir()).not.toBe(os.userInfo().homedir);
  });

  it('follows HOME changes, even in a worker thread', () => {
    const home = path.join(os.tmpdir(), 'ipb-isolation-check');
    process.env.HOME = home;
    expect(os.homedir()).toBe(home);
  });

  it('refuses to hand out the real home folder', () => {
    process.env.HOME = os.userInfo().homedir;
    expect(() => os.homedir()).toThrow(/real home folder/);
  });
});
