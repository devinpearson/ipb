import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getPackageDataDir, getTemplatePath } from '../../src/utils/package-paths.js';

describe('getPackageDataDir', () => {
  it('uses the folder above bin/utils for the tsc build', () => {
    const url = pathToFileURL(path.resolve('/app/bin/utils/package-paths.js')).href;
    expect(getPackageDataDir(url, false)).toBe(path.resolve('/app/bin'));
  });

  it('uses the bundle folder for the esbuild bundle', () => {
    const url = pathToFileURL(path.resolve('/app/dist-bundle/index.cjs')).href;
    expect(getPackageDataDir(url, true)).toBe(path.resolve('/app/dist-bundle'));
  });
});

describe('getTemplatePath', () => {
  it('resolves a template inside the templates folder', () => {
    expect(getTemplatePath('default', '/data')).toBe(path.join('/data', 'templates', 'default'));
  });

  it.each(['../secrets', 'a/b', '..', '', 'name with space', '%2e%2e'])(
    'rejects %j, which could leave the templates folder',
    (name) => {
      expect(getTemplatePath(name, '/data')).toBeUndefined();
    }
  );

  it('finds the real templates shipped with the source tree', () => {
    // In the source tree, templates/ lives at the repo root.
    expect(getTemplatePath('default', path.resolve('.'))).toBe(path.resolve('templates/default'));
  });
});
