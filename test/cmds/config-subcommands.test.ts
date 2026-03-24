/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/index.ts', () => ({
  credentialLocation: {
    folder: '/tmp/.ipb',
    filename: '/tmp/.ipb/.credentials.json',
  },
  optionCredentials: vi.fn(async (_options, credentials) => credentials),
}));

import {
  finalizeProfileDeletion,
  runConfigEdit,
  runConfigProfileDelete,
  runConfigProfileList,
  runConfigProfileSet,
  runConfigProfileShow,
} from '../../src/cmds/config-subcommands.js';
import { CliError, ERROR_CODES } from '../../src/errors.js';
import * as utils from '../../src/utils.js';

describe('config subcommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runConfigProfileList prints empty message when no profiles', async () => {
    vi.spyOn(utils, 'listProfiles').mockResolvedValue([]);

    await runConfigProfileList();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No profiles found'));
  });

  it('runConfigProfileSet throws when profile file is missing', async () => {
    vi.spyOn(utils, 'readProfile').mockRejectedValue(
      new CliError(ERROR_CODES.FILE_NOT_FOUND, 'missing')
    );

    await expect(runConfigProfileSet('ghost')).rejects.toThrow(CliError);
  });

  it('runConfigProfileDelete removes profile and finalizes active state', async () => {
    vi.spyOn(utils, 'deleteProfile').mockResolvedValue(undefined);
    vi.spyOn(utils, 'getActiveProfile').mockResolvedValue('prod');
    vi.spyOn(utils, 'setActiveProfile').mockResolvedValue(undefined);

    await runConfigProfileDelete('prod');

    expect(utils.deleteProfile).toHaveBeenCalledWith('prod');
    expect(utils.setActiveProfile).toHaveBeenCalledWith(null);
  });

  it('finalizeProfileDeletion only clears active when it matches deleted name', async () => {
    vi.spyOn(utils, 'getActiveProfile').mockResolvedValue('staging');
    vi.spyOn(utils, 'setActiveProfile').mockResolvedValue(undefined);

    await finalizeProfileDeletion('prod');

    expect(utils.setActiveProfile).not.toHaveBeenCalled();
  });

  it('runConfigEdit opens default credentials path when no profile', async () => {
    vi.spyOn(utils, 'openInEditor').mockResolvedValue(undefined);
    const prev = process.env.EDITOR;
    process.env.EDITOR = 'vim';

    await runConfigEdit({ defaultCredentialsFile: '/home/u/.ipb/.credentials.json' });

    expect(utils.openInEditor).toHaveBeenCalledWith('/home/u/.ipb/.credentials.json');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Opening /home/u/.ipb/.credentials.json')
    );

    if (prev === undefined) {
      delete process.env.EDITOR;
    } else {
      process.env.EDITOR = prev;
    }
  });

  it('runConfigEdit resolves profile path when --profile is set', async () => {
    vi.spyOn(utils, 'openInEditor').mockResolvedValue(undefined);
    vi.spyOn(utils, 'getProfilePath').mockReturnValue('/profiles/prod.json');

    await runConfigEdit({
      profile: 'prod',
      defaultCredentialsFile: '/ignored/default.json',
    });

    expect(utils.getProfilePath).toHaveBeenCalledWith('prod');
    expect(utils.openInEditor).toHaveBeenCalledWith('/profiles/prod.json');
  });

  it('runConfigProfileShow prints active profile name', async () => {
    vi.spyOn(utils, 'getActiveProfile').mockResolvedValue('prod');

    await runConfigProfileShow();

    expect(console.log).toHaveBeenCalledWith('Active profile: prod');
  });
});
