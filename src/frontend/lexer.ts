import { fatalFmt } from "../utils";

export enum TokenType {
  // Literal Types
  Number,
  Identifier,
  String,

  // Keywords
  Let,
  Const,
  Function,

  // Grouping and Operators
  Equals,
  BinaryOperator,
  Semicolon,
  Comma,
  Dot,
  Colon,
  OpenParen, // (
  CloseParen, // )
  OpenBrace, // {
  CloseBrace, // }
  OpenBracket, // [
  CloseBracket, // ]

  EOF, // End of File
}

const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.Let,
  const: TokenType.Const,
  function: TokenType.Function,
};

export interface Token {
  value: string;
  type: TokenType;
}

function token(value: string | undefined, type: TokenType): Token {
  if (!value) {
    throw new Error("Token Value is undefined " + value + " " + type);
  }

  return { value, type };
}

function isAlpha(src: string): boolean {
  return (
    (src >= "a" && src <= "z") || (src >= "A" && src <= "Z") || src === "_"
  );
}

function isInt(src: string): boolean {
  const c = src.charCodeAt(0);
  return c >= 48 && c <= 57; // '0' to '9'
}

function isSkippable(str: string): boolean {
  return [" ", "\n", "\t"].includes(str);
}

// To be optimised
export function tokenize(sourceCode: string): Token[] {
  const tokens = new Array<Token>();
  const src = sourceCode.split("");

  // Build each token until end of file
  while (src.length > 0) {
    const char = src[0]!;

    switch (char) {
      case "(":
        tokens.push(token(src.shift(), TokenType.OpenParen));
        break;
      case ")":
        tokens.push(token(src.shift(), TokenType.CloseParen));
        break;
      case "{":
        tokens.push(token(src.shift(), TokenType.OpenBrace));
        break;
      case "}":
        tokens.push(token(src.shift(), TokenType.CloseBrace));
        break;
      case "[":
        tokens.push(token(src.shift(), TokenType.OpenBracket));
        break;
      case "]":
        tokens.push(token(src.shift(), TokenType.CloseBracket));
        break;
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
        tokens.push(token(src.shift(), TokenType.BinaryOperator));
        break;
      case "=":
        tokens.push(token(src.shift(), TokenType.Equals));
        break;
      case ";":
        tokens.push(token(src.shift(), TokenType.Semicolon));
        break;
      case ",":
        tokens.push(token(src.shift(), TokenType.Comma));
        break;
      case ":":
        tokens.push(token(src.shift(), TokenType.Colon));
        break;
      case ".":
        tokens.push(token(src.shift(), TokenType.Dot));
        break;
      default:
        // Handle multicharacter tokens
        if (isInt(char)) {
          let num = "";
          while (src.length > 0 && isInt(src[0]!)) {
            num += src.shift();
          }
          tokens.push(token(num, TokenType.Number));
        } else if (isAlpha(char)) {
          let ident = "";
          while (src.length > 0 && isAlpha(src[0]!)) {
            ident += src.shift();
          }
          // Check for reserved keywords
          const reserved = KEYWORDS[ident];
          if (typeof reserved === "number") {
            tokens.push(token(ident, reserved));
          } else {
            // It's an identifier
            tokens.push(token(ident, TokenType.Identifier));
          }
        } else if (char === '"' || char === "'") {
          if (src.length > 0 && src[0] === '"') {
            // It's a string literal
            src.shift(); // Remove opening quote
            let strLit = "";
            while (src.length > 0 && src[0] !== '"') {
              strLit += src.shift();
            }
            src.shift(); // Remove closing quote
            tokens.push(token(strLit, TokenType.String));
          } else if (src.length > 0 && src[0] === "'") {
            // It's a string literal with single quotes
            src.shift(); // Remove opening quote
            let strLit = "";
            while (src.length > 0 && src[0] !== "'") {
              strLit += src.shift();
            }
            src.shift(); // Remove closing quote
            tokens.push(token(strLit, TokenType.String));
          }
        } else if (isSkippable(char)) {
          src.shift(); // Skip the current character
        } else {
          // Use util fatal to avoid stack traces from throw
          // and to provide a single exit point for fatal errors.
          fatalFmt("Unrecognized character found in source code: %s", char);
        }
        break;
    }
  }

  tokens.push(token("EOF", TokenType.EOF));
  return tokens;
}

// Test the lexer
// const source = await Bun.file("./test.txt").text();
// const tokens = tokenize(source);

// for (const token of tokens) {
//   console.log(token);
// }
