import { writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import cliTable3Module from 'cli-table3';
import { isStdoutPiped } from './terminal.js';

interface CliTableLike {
  push: (...rows: unknown[]) => void;
  toString(): string;
}

type CliTableConstructor = new (options: Record<string, unknown>) => CliTableLike;

const CliTable: CliTableConstructor | undefined = (() => {
  const mod = cliTable3Module as { default?: CliTableConstructor };
  const Ctor = mod.default ?? (cliTable3Module as unknown as CliTableConstructor);
  return typeof Ctor === 'function' ? Ctor : undefined;
})();

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

export type TableData = TableRow[];

export interface OutputOptions {
  json?: boolean;
  yaml?: boolean;
  output?: string;
}

function truncateValue(value: unknown, maxLength: number): string {
  const str = String(value ?? '');
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength - 3)}...`;
}

function formatCellValue(value: unknown, maxLength: number = 50): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value);
      return truncateValue(json, maxLength);
    } catch {
      return String(value);
    }
  }
  return truncateValue(value, maxLength);
}

function determineAlignment(header: string, sampleData: TableData): 'left' | 'right' | 'center' {
  const numericPattern = /^(amount|balance|price|cost|total|count|id|key|number)$/i;
  if (numericPattern.test(header)) {
    return 'right';
  }

  const sampleValues = sampleData.slice(0, 10).map((row) => row[header]);
  const allNumeric =
    sampleValues.length > 0 &&
    sampleValues.every((val) => {
      if (val === null || val === undefined || val === '') return false;
      const num = Number(val);
      return !Number.isNaN(num) && Number.isFinite(num);
    });

  if (allNumeric) {
    return 'right';
  }

  if (sampleValues.every((val) => typeof val === 'boolean')) {
    return 'center';
  }

  return 'left';
}

function stripAnsi(value: string): string {
  // biome-ignore lint/complexity/useRegexLiterals: using constructor avoids control-character literal lint conflict
  return value.replace(new RegExp('\\u001b\\[[0-9;]*m', 'g'), '');
}

export function printTable(data: TableData): void {
  if (!data || data.length === 0) {
    console.log('No data to display.');
    return;
  }

  if (CliTable) {
    const headers: string[] = Object.keys(data[0] as TableRow);
    const rows = data as TableRow[];
    const terminalWidth = process.stdout.columns || 120;
    const minColumnWidth = 10;
    const maxColumnWidth = 36;

    const colWidths = headers.map((header) => {
      const values = rows.map((row) => formatCellValue(row[header], 256));
      const longest = Math.max(header.length, ...values.map((value) => stripAnsi(value).length));
      const widthWithPadding = longest + 2;
      return Math.min(
        maxColumnWidth,
        Math.max(
          minColumnWidth,
          Math.min(widthWithPadding, Math.floor(terminalWidth / headers.length))
        )
      );
    });

    const tableOptions: Record<string, unknown> = {
      head: headers.map((h) => chalk.bold.cyan(h)),
      style: {
        head: [],
        border: ['gray'],
        compact: true,
      },
      colWidths,
      colAligns: headers.map((header) => determineAlignment(header, data)),
      wordWrap: false,
    };
    const table = new CliTable(tableOptions);

    rows.forEach((row) => {
      const rowData = headers.map((header, index) => {
        const value = row[header];
        const columnWidth = Math.max(colWidths[index] ?? minColumnWidth, minColumnWidth) - 2;
        return formatCellValue(value, columnWidth);
      });
      table.push(rowData);
    });

    console.log(table.toString());
    return;
  }

  const headers: string[] = Object.keys(data[0] as TableRow);
  const colWidths: number[] = headers.map((header) =>
    Math.max(header.length, ...data.map((row) => String(row[header] ?? '').length))
  );

  const headerRow: string = headers
    .map((header, index) => header.padEnd(colWidths[index] ?? 0))
    .join(' | ');
  console.log(headerRow);
  console.log('-'.repeat(headerRow.length));

  data.forEach((row) => {
    const dataRow: string = headers
      .map((header, index) => String(row[header] ?? '').padEnd(colWidths[index] ?? 0))
      .join(' | ');
    console.log(dataRow);
  });
}

export async function formatOutput(
  data: unknown,
  options: OutputOptions,
  showCount?: (count: number) => void
): Promise<void> {
  const isPiped = isStdoutPiped();
  const autoJson = isPiped && !options.yaml && !options.output;
  const outputFormat = options.yaml ? 'yaml' : options.json || autoJson ? 'json' : null;
  const shouldOutputStructured = outputFormat || options.output;

  if (shouldOutputStructured) {
    let output: string;

    if (outputFormat === 'yaml') {
      const yaml = await import('js-yaml');
      output = yaml.dump(data, { indent: 2, lineWidth: -1 });
    } else {
      output = JSON.stringify(data, null, 2);
    }

    if (options.output) {
      await writeFile(options.output, output, 'utf8');
      if (!isPiped) {
        console.log(`Output written to ${options.output}`);
      }
    } else {
      process.stdout.write(output);
    }
  } else if (Array.isArray(data)) {
    if (data.length === 0) {
      if (!isPiped) {
        console.log('No data to display.');
      }
      return;
    }
    if (!isPiped) {
      printTable(data as TableData);
      if (showCount) {
        showCount(data.length);
      }
    } else {
      process.stdout.write(JSON.stringify(data, null, 2));
    }
  } else if (isPiped) {
    process.stdout.write(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
