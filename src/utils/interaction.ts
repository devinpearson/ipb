import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CliError, ERROR_CODES } from '../errors.js';
import { isStdoutPiped } from './terminal.js';

export async function pageOutput(
  content: string,
  options: { isPiped?: boolean } = {}
): Promise<void> {
  if (options.isPiped || isStdoutPiped()) {
    process.stdout.write(content);
    return;
  }

  console.log(content);
}

export function getTempDir(): string {
  return tmpdir();
}

export function getModuleDirname(metaUrl: string = import.meta.url): string {
  const fileUrl = new URL(metaUrl);
  const dirPath = path.dirname(fileUrl.pathname);

  if (dirPath.startsWith('/snapshot/')) {
    return dirPath;
  }

  return dirPath;
}

function getDefaultEditor(): string | null {
  if (process.platform === 'win32') {
    return 'notepad.exe';
  }

  const unixEditors = ['nano', 'vim', 'vi', 'emacs'];
  return unixEditors[0] || null;
}

export async function openInEditor(
  filepath: string,
  options: { editor?: string } = {}
): Promise<void> {
  const editor = options.editor || process.env.EDITOR || getDefaultEditor();

  if (!editor) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'No editor available. Set EDITOR environment variable (e.g., export EDITOR=nano)'
    );
  }

  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const editorParts = editor.split(/\s+/);
  const editorCommand = editorParts[0];
  const editorArgs = [...editorParts.slice(1), filepath];

  if (!editorCommand) {
    throw new CliError(
      ERROR_CODES.FILE_NOT_FOUND,
      'Invalid editor command. Set EDITOR environment variable to a valid editor.'
    );
  }

  return new Promise<void>((resolve, reject) => {
    const editorProcess = spawn(editorCommand, editorArgs, {
      stdio: 'inherit',
    });

    editorProcess.on('error', (error: Error) => {
      reject(
        new CliError(
          ERROR_CODES.FILE_NOT_FOUND,
          `Failed to open editor "${editorCommand}": ${error.message}. Set EDITOR environment variable to a valid editor.`
        )
      );
    });

    editorProcess.on('exit', (code: number | null) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(
          new CliError(
            ERROR_CODES.FILE_NOT_FOUND,
            `Editor "${editorCommand}" exited with code ${code}`
          )
        );
      }
    });
  });
}

export async function confirmDestructiveOperation(
  message: string,
  options: { yes?: boolean } = {}
): Promise<boolean> {
  if (options.yes === true) {
    return true;
  }

  const isPiped = !process.stdout.isTTY;
  if (isPiped) {
    return false;
  }

  const { confirm } = await import('@inquirer/prompts');

  try {
    return await confirm({
      message,
      default: false,
    });
  } catch {
    return false;
  }
}
