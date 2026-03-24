import { readFile, writeFile } from 'node:fs/promises';
import { formatFileSize, getFileSize } from './file-size.js';
import { createSpinner, withSpinner, type Spinner } from './spinner.js';
import type { OutputOptions } from './output.js';
import { formatOutput } from './output.js';

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
 * Handles common list command output behavior (empty, table, structured output).
 * @param options - List command rendering options
 */
export async function runListCommand<TFull, TSimple = TFull>(
  options: RunListCommandOptions<TFull, TSimple>
): Promise<void> {
  const { isPiped, items, outputOptions, emptyMessage, countMessage, mapSimple } = options;

  if (!items || items.length === 0) {
    if (!isPiped) {
      console.log(emptyMessage);
    } else {
      process.stdout.write('[]\n');
    }
    return;
  }

  const simpleItems = mapSimple ? mapSimple(items) : (items as unknown as TSimple[]);
  const dataToOutput =
    outputOptions.json || outputOptions.yaml || outputOptions.output || isPiped ? items : simpleItems;

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

  const writeSpinner = createSpinner(
    spinnerEnabled,
    progressMessage(formatFileSize(contentSize))
  );
  await withSpinner(writeSpinner, spinnerEnabled, async () => {
    await writeFile(filename, content, 'utf8');
  });

  const finalSize = await getFileSize(filename);
  console.log(successMessage(formatFileSize(finalSize)));
}

/**
 * Handles common read-file then upload flow with spinner progress text updates.
 * @param options - Read and upload command options
 * @returns Upload result
 */
export async function runReadUploadCommand<TResult>(
  options: RunReadUploadCommandOptions<TResult>
): Promise<TResult> {
  const {
    spinner,
    spinnerEnabled,
    filename,
    readMessage,
    uploadMessage,
    readFileContent,
    upload,
  } = options;

  return await withSpinner(spinner, spinnerEnabled, async () => {
    const codeFileSize = await getFileSize(filename);
    spinner.text = readMessage(formatFileSize(codeFileSize));
    const readContent = readFileContent ?? ((path: string) => readFile(path, 'utf8'));
    const content = await readContent(filename);
    const contentSize = Buffer.byteLength(content, 'utf8');
    spinner.text = uploadMessage(formatFileSize(contentSize));
    return await upload(content);
  });
}
