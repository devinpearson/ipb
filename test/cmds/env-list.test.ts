/// <reference types="vitest" />

import { describe, expect, it, vi } from 'vitest';
import { envListCommand } from '../../src/cmds/env-list';

vi.mock('../../src/index.ts', () => ({
  printTitleBox: vi.fn(),
}));

vi.mock('../../src/utils.ts', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts');
  return {
    ...actual,
    runListCommand: vi.fn(),
    isStdoutPiped: vi.fn(() => false),
  };
});

describe('envListCommand', () => {
  it('uses shared list runner for structured output', async () => {
    const options = {
      host: 'test-host',
      apiKey: 'test-api-key',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      credentialsFile: 'test-credentials-file',
      verbose: false,
      json: true,
    };

    const { runListCommand } = await import('../../src/utils.ts');

    await envListCommand(options);

    expect(runListCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        isPiped: false,
        outputOptions: { json: true, yaml: undefined, output: undefined },
      })
    );
  });
});
