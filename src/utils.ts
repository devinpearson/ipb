import chalk from "chalk";
import type { Credentials } from "./cmds/types.js";

/**
 * Print a styled CLI title box for the Investec Programmable Banking CLI.
 */
export function printTitleBox() {
  console.log("");
  console.log("🦓 Investec Programmable Banking CLI");
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("");
}

/**
 * Handle and display CLI errors in a consistent format.
 * @param error The error object to handle
 * @param options CLI options (may include verbose)
 * @param context A string describing the context of the error
 */
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

/**
 * Check the latest version of the CLI on npm.
 * @returns The latest version string
 */
export async function checkLatestVersion() {
  const response = await fetch("https://registry.npmjs.org/investec-ipb", {
    method: "GET",
    headers: {
      Accept: "application/vnd.npm.install-v1+json",
    },
  });

  const data = (await response.json()) as { "dist-tags": { latest: string } };
  const latestVersion = data["dist-tags"].latest;

  return latestVersion;
}

/**
 * Represents a row in a table for CLI output.
 */
export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Represents table data for CLI output.
 */
export type TableData = TableRow[];

/**
 * Print a table to the CLI given an array of objects.
 * @param data The table data to print
 */
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

/**
 * Load credentials from a JSON file and merge into the provided credentials object.
 * @param credentials The credentials object to update
 * @param credentialsFile The path to the credentials file
 * @returns The updated credentials object
 */
export async function loadCredentialsFile(
  credentials: Credentials,
  credentialsFile: string,
) {
  if (credentialsFile) {
    const file = await import("file://" + credentialsFile, {
      with: { type: "json" },
    });
    if (file.host) {
      credentials.host = file.host;
    }
    if (file.apiKey) {
      credentials.apiKey = file.apiKey;
    }
    if (file.clientId) {
      credentials.clientId = file.clientId;
    }
    if (file.clientSecret) {
      credentials.clientSecret = file.clientSecret;
    }
    if (file.openaiKey) {
      credentials.openaiKey = file.openaiKey;
    }
    if (file.sandboxKey) {
      credentials.sandboxKey = file.sandboxKey;
    }
  }
  return credentials;
}
