/// <reference types="vitest" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newCommand } from '../../src/cmds/new';

// Copies the real templates with the real fs, so the copy itself is tested
// (the standalone binaries can't use fs.cpSync on their built-in templates).
const templatesDir = path.resolve('templates');

// From the source tree the CLI would look in src/templates; point it at the repo's templates/.
// The repo root is captured up front because the tests change folder.
const repoRoot = vi.hoisted(() => process.cwd());
vi.mock('../../src/utils/package-paths.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/package-paths.js')>();
  return {
    ...actual,
    getTemplatePath: (template: string) => actual.getTemplatePath(template, repoRoot),
  };
});

let workDir: string;
let previousCwd: string;

function listFiles(dir: string, prefix = ''): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`]
    )
    .sort();
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  previousCwd = process.cwd();
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipb-new-'));
});

afterEach(() => {
  process.chdir(previousCwd);
  fs.rmSync(workDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const options = (template: string, force = false) => ({
  template,
  verbose: false,
  force,
  spinner: false,
});

describe('ipb new copies templates', () => {
  it.each(fs.readdirSync(templatesDir))(
    'copies every file of the %s template',
    async (template) => {
      // Resolve the template path before changing folder.
      const source = path.join(templatesDir, template);
      process.chdir(workDir);

      await newCommand('demo', options(template));

      const files = listFiles(source);
      expect(files).toContain('.env.prod');
      expect(listFiles(path.join(workDir, 'demo'))).toEqual(files);
      for (const file of files) {
        expect(fs.readFileSync(path.join(workDir, 'demo', file))).toEqual(
          fs.readFileSync(path.join(source, file))
        );
      }
    }
  );

  it('replaces an existing project with --force', async () => {
    process.chdir(workDir);
    fs.mkdirSync('demo');
    fs.writeFileSync(path.join('demo', 'stale.txt'), 'old');

    await newCommand('demo', options('default', true));

    expect(fs.existsSync(path.join('demo', 'stale.txt'))).toBe(false);
    expect(fs.existsSync(path.join('demo', 'main.js'))).toBe(true);
  });
});
