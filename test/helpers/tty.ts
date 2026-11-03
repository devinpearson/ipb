/**
 * Makes stdin/stdout report as an interactive terminal (or not) until the returned restore is called.
 */
export function setInteractive(interactive: boolean): () => void {
  const original = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY };
  process.stdin.isTTY = interactive;
  process.stdout.isTTY = interactive;
  return () => {
    process.stdin.isTTY = original.stdin;
    process.stdout.isTTY = original.stdout;
  };
}
