import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, vi } from 'vitest';

// Every test file gets its own throwaway home folder, so nothing can read or
// delete the real ~/.ipb (credentials, profiles, history).
//
// os.homedir() ignores process.env.HOME changes made inside a worker thread,
// so `homedir` is replaced with one that reads HOME on every call, and it
// refuses to return the real home folder at all.
const realHome = os.userInfo().homedir;
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ipb-test-home-'));
process.env.HOME = testHome;
process.env.USERPROFILE = testHome;

function isolatedHomedir(): string {
  const home = process.env.HOME || testHome;
  if (path.resolve(home) === path.resolve(realHome)) {
    throw new Error(
      `Test tried to use the real home folder (${realHome}). Point HOME at a temp dir.`
    );
  }
  return home;
}

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, default: { ...actual, homedir: isolatedHomedir }, homedir: isolatedHomedir };
});

afterAll(() => {
  fs.rmSync(testHome, { recursive: true, force: true });
});
