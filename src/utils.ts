import chalk from "chalk";
import type { Credentials } from "./cmds/types.js";

export function handleCliError(
  error: any,
  options: { verbose?: boolean },
  context: string,
) {
  console.error(chalk.redBright(`Failed to ${context}:`), error.message);
  console.log("");
  if (options.verbose) {
    console.error(error);
  }
}

export async function checkLatestVersion() {
  try {
    const response = await fetch("https://registry.npmjs.org/investec-ipb", {
      method: "GET",
      headers: {
        Accept: "application/vnd.npm.install-v1+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.statusText}`);
    }

    const data = (await response.json()) as { "dist-tags": { latest: string } };
    const latestVersion = data["dist-tags"].latest;

    return latestVersion;
  } catch (error) {
    console.warn("Failed to check latest version:", error);
    return null;
  }
}

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

export type TableData = TableRow[];

export function printTable(data: TableData): void {
  if (!data || data.length === 0) {
    console.log("No data to display.");
    return;
  }

  // Determine column widths based on header and data length
  const headers: string[] = Object.keys(data[0] as TableRow);
  const colWidths: number[] = headers.map((header) =>
    Math.max(header.length, ...data.map((row) => String(row[header]).length)),
  );

  // Print header row
  const headerRow: string = headers
    .map((header, index) => header.padEnd(colWidths[index] ?? 0))
    .join(" | ");
  console.log(headerRow);
  console.log("-".repeat(headerRow.length));

  // Print data rows
  data.forEach((row) => {
    const dataRow: string = headers
      .map((header, index) => String(row[header]).padEnd(colWidths[index] ?? 0))
      .join(" | ");
    console.log(dataRow);
  });
}

export async function loadCredentialsFile(
  credentials: Credentials,
  credentialsFile: string,
) {
  if (credentialsFile) {
    try {
      const file = await import("file://" + credentialsFile, {
        with: { type: "json" },
      });

      // Only copy known credential properties
      const credentialKeys: (keyof Credentials)[] = [
        "host",
        "apiKey",
        "clientId",
        "clientSecret",
        "openaiKey",
        "sandboxKey",
        "cardKey",
      ];

      credentialKeys.forEach((key) => {
        if (file[key] !== undefined) {
          credentials[key] = file[key];
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load credentials file: ${message}`);
    }
  }
  return credentials;
}
