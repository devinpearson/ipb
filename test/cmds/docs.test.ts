/// <reference types="vitest" />

import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docsCommand, generateCommandDocumentation } from '../../src/cmds/docs';

vi.mock('../../src/index.ts', () => ({
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

const mockFsPromises = vi.hoisted(() => ({
  writeFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  promises: mockFsPromises,
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    isStdoutPiped: vi.fn(() => false),
    createSpinner: vi.fn(() => ({
      start: vi.fn(function () {
        return this;
      }),
      stop: vi.fn(),
      clear: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
    })),
    withSpinner: vi.fn(async (_s, _e, fn: () => Promise<unknown>) => await fn()),
    validateFilePathForWrite: vi.fn(async (path: string) => path),
  };
});

describe('docs command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  it('generates markdown containing command headings', () => {
    const program = new Command();
    program.command('accounts').description('List accounts');
    program.command('cards').description('List cards');

    const markdown = generateCommandDocumentation(program);
    expect(markdown).toContain('# IPB CLI Command Reference');
    expect(markdown).toContain('## accounts');
    expect(markdown).toContain('## cards');
  });

  it('writes generated documentation to output path', async () => {
    const program = new Command();
    program.command('accounts').description('List accounts');

    await docsCommand('GENERATED_README.md', program);

    expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
      'GENERATED_README.md',
      expect.stringContaining('IPB CLI Command Reference'),
      'utf8'
    );
  });
});
