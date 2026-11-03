import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Injected by esbuild for the single-file bundle (and the pkg binaries built from it).
declare const __IPB_BUNDLED__: boolean | undefined;

/**
 * Folder that holds the files shipped next to the CLI: templates/, assets/ and instructions.txt.
 * @param moduleUrl - URL of this module (overridable for tests)
 * @param bundled - Whether this is the esbuild bundle (overridable for tests)
 */
export function getPackageDataDir(
  moduleUrl: string = import.meta.url,
  bundled: boolean = typeof __IPB_BUNDLED__ !== 'undefined' && __IPB_BUNDLED__
): string {
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));
  // The bundle is dist-bundle/index.cjs, with templates/ beside it.
  // The tsc build is bin/utils/package-paths.js, with templates/ in bin/.
  return bundled ? moduleDir : path.resolve(moduleDir, '..');
}

/**
 * Path to a named project template, or undefined when the name could escape the templates folder.
 * @param template - Template name as given on the command line
 */
export function getTemplatePath(
  template: string,
  dataDir = getPackageDataDir()
): string | undefined {
  if (!/^[a-zA-Z0-9_-]+$/.test(template)) {
    return undefined;
  }
  return path.join(dataDir, 'templates', template);
}
