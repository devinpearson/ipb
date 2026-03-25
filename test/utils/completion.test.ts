/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { generateCompletionScript } from '../../src/completion';
import { CliError, ERROR_CODES } from '../../src/errors';

describe('generateCompletionScript', () => {
  it('returns bash script for bash', () => {
    const script = generateCompletionScript('bash');
    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('_ipb');
    expect(script).toContain('complete -F _ipb ipb');
  });

  it('returns zsh script for zsh', () => {
    const script = generateCompletionScript('zsh');
    expect(script).toContain('#compdef ipb');
    expect(script).toContain('_ipb');
  });

  it('throws CliError for unsupported shell', () => {
    expect(() => generateCompletionScript('fish')).toThrow(CliError);
    expect(() => generateCompletionScript('fish')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INVALID_INPUT })
    );
  });
});
