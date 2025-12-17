export function fatal(message: string): never {
  // Print just the message (no stack) and exit with code 1
  // Keep it simple so the language user sees only relevant errors.
  console.error(message);
  process.exit(1);
}

export function fatalFmt(fmt: string, ...args: any[]): never {
  console.error(fmt, ...args);
  process.exit(1);
}
