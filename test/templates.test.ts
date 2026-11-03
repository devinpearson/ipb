/// <reference types="vitest" />

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

// The card platform and the emulator call these by name, so a template that renames them
// (for example to silence an unused-variable lint) silently does nothing.
const HANDLERS = ['beforeTransaction', 'afterTransaction', 'afterDecline'];

const templatesDir = path.resolve('templates');

describe.each(fs.readdirSync(templatesDir))('the %s template', (template) => {
  it('defines every handler the card calls', () => {
    const code = fs.readFileSync(path.join(templatesDir, template, 'main.js'), 'utf8');
    const types = vm.runInNewContext(
      `${code}\n;({ ${HANDLERS.map((h) => `${h}: typeof ${h}`).join(', ')} })`,
      { console: { log() {} } }
    );

    expect(types).toEqual(Object.fromEntries(HANDLERS.map((h) => [h, 'function'])));
  });
});
