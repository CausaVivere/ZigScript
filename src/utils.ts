import type { Token } from "./frontend/lexer";

export function fatal(message: string): never {
  // Print just the message (no stack) and exit with code 1
  // Keep it simple so the language user sees only relevant errors.
  console.error(message);
  process.exit(1);
}

export function fatalFmt(start: number, fmt: string, ...args: any[]): never {
  const { line, column } = offsetToLineColumn(globalThis.sourceCode!, start);
  console.error(`Error at line ${line}, column ${column}: ${fmt}`, ...args);
  process.exit(1);
}

export function offsetToLineColumn(source: string, offset: number) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset; i++) {
    if (source[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}
