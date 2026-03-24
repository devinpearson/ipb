/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError, ERROR_CODES } from '../../src/errors';
import { newCommand } from '../../src/cmds/new';

vi.mock('../../src/index.ts', () => ({
  printTitleBox: vi.fn(),
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    getSafeText: vi.fn((text: string) => text),
  };
});

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
  cpSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: mockFs,
}));

describe('newCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  it('copies template to new project when valid', async () => {
    mockFs.existsSync
      .mockReturnValueOnce(true) // template exists
      .mockReturnValueOnce(false); // project does not exist

    await newCommand('my-project', {
      template: 'default',
      verbose: false,
      force: false,
    });

    expect(mockFs.cpSync).toHaveBeenCalledWith(expect.any(String), 'my-project', { recursive: true });
  });

  it('throws for invalid project names', async () => {
    mockFs.existsSync.mockReturnValue(true); // template exists

    await expect(
      newCommand('bad name', {
        template: 'default',
        verbose: false,
        force: false,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_PROJECT_NAME });
  });

  it('throws when project already exists and force is false', async () => {
    mockFs.existsSync
      .mockReturnValueOnce(true) // template exists
      .mockReturnValueOnce(true); // project exists

    await expect(
      newCommand('existing-project', {
        template: 'default',
        verbose: false,
        force: false,
      })
    ).rejects.toThrow(CliError);
  });
});
