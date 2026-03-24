/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsStdoutPiped = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../src/utils/terminal.js', () => ({
  isStdoutPiped: () => mockIsStdoutPiped(),
}));

import { formatOutput, printTable } from '../../src/utils/output.js';

// biome-ignore lint/suspicious/noControlCharactersInRegex: match ANSI SGR via escaped code unit (same as output.ts stripAnsi)
const ansiPattern = /\u001b\[[0-9;]*m/g;

describe('printTable', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    mockIsStdoutPiped.mockReturnValue(false);
  });

  it('logs a friendly message when data is empty', () => {
    printTable([]);
    expect(consoleLogSpy).toHaveBeenCalledWith('No data to display.');
  });

  it('renders a table for non-empty data', () => {
    printTable([{ name: 'A', amount: 10 }]);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output = String(consoleLogSpy.mock.calls[0]?.[0]);
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain('name');
    expect(output).toContain('amount');
  });

  it('uses narrow column layout when terminal width is small', () => {
    const original = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 36,
      writable: true,
    });

    try {
      printTable([
        { a: '1', b: '2', c: '3' },
        { a: '4', b: '5', c: '6' },
      ]);
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = String(consoleLogSpy.mock.calls[0]?.[0]);
      expect(output.length).toBeGreaterThan(0);
    } finally {
      if (original) {
        Object.defineProperty(process.stdout, 'columns', original);
      } else {
        Reflect.deleteProperty(process.stdout, 'columns');
      }
    }
  });

  it('omits ANSI color codes when NO_COLOR is set', () => {
    const prev = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';

    try {
      printTable([{ column: 'value' }]);
      const output = String(consoleLogSpy.mock.calls[0]?.[0]);
      expect(output).not.toMatch(ansiPattern);
    } finally {
      if (prev === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = prev;
      }
    }
  });
});

describe('formatOutput', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    mockIsStdoutPiped.mockReturnValue(false);
  });

  it('writes JSON to stdout when piped and data is a non-empty array', async () => {
    mockIsStdoutPiped.mockReturnValue(true);
    await formatOutput([{ id: 1 }], {});
    expect(stdoutWriteSpy).toHaveBeenCalledWith(JSON.stringify([{ id: 1 }], null, 2));
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('writes JSON empty array when piped and array is empty (auto-JSON path)', async () => {
    mockIsStdoutPiped.mockReturnValue(true);
    await formatOutput([], {});
    expect(stdoutWriteSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('logs empty-array message when not piped and array is empty', async () => {
    mockIsStdoutPiped.mockReturnValue(false);
    await formatOutput([], {});
    expect(consoleLogSpy).toHaveBeenCalledWith('No data to display.');
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });
});
