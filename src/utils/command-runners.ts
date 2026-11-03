import { readFile, writeFile } from 'node:fs/promises';
import { formatFileSize, getFileSize } from './file-size.js';
import type { OutputOptions } from './output.js';
import { formatOutput } from './output.js';
import { resolveSpinnerState } from './runtime-flags.js';
import { createSpinner, type Spinner, withSpinner } from './spinner.js';

interface RunListCommandOptions<TFull, TSimple = TFull> {
  isPiped: boolean;
  items: TFull[] | null | undefined;
  outputOptions: OutputOptions;
  emptyMessage: string;
  countMessage: (count: number) => string;
  mapSimple?: (items: TFull[]) => TSimple[];
}

interface RunWriteCommandOptions {
  spinnerEnabled: boolean;
  filename: string;
  content: string;
  progressMessage: (sizeLabel: string) => string;
  successMessage: (sizeLabel: string) => string;
}

interface RunReadUploadCommandOptions<TResult> {
  spinner: Spinner;
  spinnerEnabled: boolean;
  filename: string;
  readMessage: (sizeLabel: string) => string;
  uploadMessage: (sizeLabel: string) => string;
  readFileContent?: (filename: string) => Promise<string>;
  upload: (content: string) => Promise<TResult>;
}

/**
 * Keeps items where any field contains `search` (case-insensitive). No search keeps everything.
 */
export function filterBySearch<T extends object>(
  items: T[] | null | undefined,
  search: string | undefined
): T[] | null | undefined {
  const query = search?.trim().toLowerCase();
  if (!query || !items) {
    return items;
  }
  return items.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(query))
  );
}

/**
 * Handles common list command output behavior (empty, table, structured output).
 * @param options - List command rendering options
 */
export async function runListCommand<TFull, TSimple = TFull>(
  options: RunListCommandOptions<TFull, TSimple>
): Promise<void> {
  const { isPiped, items, outputOptions, emptyMessage, countMessage, mapSimple } = options;

  if (!Array.isArray(items) || items.length === 0) {
    if (!isPiped) {
      console.log(emptyMessage);
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  const simpleItems = mapSimple ? mapSimple(items) : (items as unknown as TSimple[]);
  const dataToOutput =
    outputOptions.json || outputOptions.yaml || outputOptions.output || isPiped
      ? items
      : simpleItems;

  await formatOutput(dataToOutput, outputOptions, (count) => {
    if (!isPiped) {
      console.log(`\n${countMessage(count)}`);
    }
  });
}

/**
 * Handles common file-write command behavior with spinner progress and final size output.
 * @param options - Write command rendering options
 */
export async function runWriteCommand(options: RunWriteCommandOptions): Promise<void> {
  const { spinnerEnabled, filename, content, progressMessage, successMessage } = options;
  const contentSize = Buffer.byteLength(content, 'utf8');

  const writeSpinner = createSpinner(spinnerEnabled, progressMessage(formatFileSize(contentSize)));
  await withSpinner(writeSpinner, spinnerEnabled, async () => {
    await writeFile(filename, content, { encoding: 'utf8', mode: 0o600 });
  });

  const finalSize = await getFileSize(filename);
  console.log(successMessage(formatFileSize(finalSize)));
}

interface WithCommandSpinnerOptions {
  spinner?: boolean;
  verbose?: boolean;
}

/**
 * Encapsulates the spinner setup boilerplate shared by every command:
 * resolve spinner/verbose state, create the spinner, and run the operation inside it.
 * @param options - Command options carrying spinner/verbose flags
 * @param isPiped - Whether stdout is piped
 * @param label - Initial spinner label
 * @param operation - Async work to execute; receives the resolved verbose flag
 * @returns The operation's return value plus the resolved spinnerEnabled and verbose flags
 */
export async function withCommandSpinner(
  options: WithCommandSpinnerOptions,
  isPiped: boolean,
  label: string,
  operation: (verbose: boolean) => Promise<void>
): Promise<void> {
  const { spinnerEnabled, verbose } = resolveSpinnerState({
    spinnerFlag: options.spinner,
    verboseFlag: options.verbose,
    isPiped,
  });
  const spinner = createSpinner(spinnerEnabled, label);
  await withSpinner(spinner, spinnerEnabled, () => operation(verbose));
}

/**
 * Handles common read-file then upload flow with spinner progress text updates.
 * @param options - Read and upload command options
 * @returns Upload result
 */
export async function runReadUploadCommand<TResult>(
  options: RunReadUploadCommandOptions<TResult>
): Promise<TResult> {
  const { spinner, spinnerEnabled, filename, readMessage, uploadMessage, readFileContent, upload } =
    options;

  return await withSpinner(spinner, spinnerEnabled, async () => {
    const codeFileSize = await getFileSize(filename);
    spinner.update(readMessage(formatFileSize(codeFileSize)));
    const readContent = readFileContent ?? ((path: string) => readFile(path, 'utf8'));
    const content = await readContent(filename);
    const contentSize = Buffer.byteLength(content, 'utf8');
    spinner.update(uploadMessage(formatFileSize(contentSize)));
    return await upload(content);
  });
}
