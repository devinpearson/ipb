/// <reference types="vitest" />

import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerCliCommands } from '../../src/register-cli-commands';

const runCommand = vi.hoisted(() => vi.fn());
const simulateCommand = vi.hoisted(() => vi.fn());
vi.mock('../../src/cmds/run.js', () => ({ runCommand }));
vi.mock('../../src/cmds/simulate.js', () => ({ simulateCommand }));

async function parse(...args: string[]) {
  const program = new Command();
  registerCliCommands(program, {} as Parameters<typeof registerCliCommands>[1]);
  await program.parseAsync(['node', 'ipb', ...args]);
}

afterEach(() => {
  vi.unstubAllEnvs();
  runCommand.mockReset();
  simulateCommand.mockReset();
});

describe.each([
  ['run', runCommand, []],
  ['simulate', simulateCommand, ['-c', '1']],
])('%s transaction defaults', (command, handler, extra) => {
  it('uses the built-in defaults', async () => {
    await parse(command as string, '-f', 'main.js', ...(extra as string[]));

    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      amount: '10000',
      currency: 'zar',
      mcc: '0000',
      merchant: 'The Coders Bakery',
      city: 'Cape Town',
      country: 'ZA',
    });
  });

  it('takes defaults from IPB_TX_* and lets flags win', async () => {
    vi.stubEnv('IPB_TX_AMOUNT', '2500');
    vi.stubEnv('IPB_TX_CURRENCY', 'USD');
    vi.stubEnv('IPB_TX_MCC', '5411');
    vi.stubEnv('IPB_TX_MERCHANT', 'Corner Cafe');
    vi.stubEnv('IPB_TX_CITY', 'Durban');
    vi.stubEnv('IPB_TX_COUNTRY', 'US');

    await parse(command as string, '-f', 'main.js', '--currency', 'EUR', ...(extra as string[]));

    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      amount: '2500',
      currency: 'EUR',
      mcc: '5411',
      merchant: 'Corner Cafe',
      city: 'Durban',
      country: 'US',
    });
  });
});
