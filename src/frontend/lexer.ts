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
  start: number;
  end: number;
}

function token(
  value: string | undefined,
  type: TokenType,
  start: number,
  end: number
): Token {
  if (!value) {
    throw new Error("Token Value is undefined " + value + " " + type);
  }

  return { value, type, start, end };
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

function isAlphaNumeric(src: string): boolean {
  return isAlpha(src) || isInt(src);
}

function isSkippable(str: string): boolean {
  return [" ", "\n", "\t"].includes(str);
}

// To be optimised
export function tokenize(sourceCode: string): Token[] {
  const tokens = new Array<Token>();
  const src = sourceCode.split("");

  let position = 0; // Current character offset in source

  // Build each token until end of file
  while (src.length > 0) {
    const char = src[0]!;
    const tokenStart = position;

    // Handle single-line comments
    if (char === "/" && src[1] === "/") {
      // Skip until end of line
      while (src.length > 0 && src[0] !== "\n") {
        src.shift();
        position++;
      }
      continue;
    }

    switch (char) {
      case "(":
        src.shift();
        position++;
        tokens.push(token("(", TokenType.OpenParen, tokenStart, position));
        break;
      case ")":
        src.shift();
        position++;
        tokens.push(token(")", TokenType.CloseParen, tokenStart, position));
        break;
      case "{":
        src.shift();
        position++;
        tokens.push(token("{", TokenType.OpenBrace, tokenStart, position));
        break;
      case "}":
        src.shift();
        position++;
        tokens.push(token("}", TokenType.CloseBrace, tokenStart, position));
        break;
      case "[":
        src.shift();
        position++;
        tokens.push(token("[", TokenType.OpenBracket, tokenStart, position));
        break;
      case "]":
        src.shift();
        position++;
        tokens.push(token("]", TokenType.CloseBracket, tokenStart, position));
        break;
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
        src.shift();
        position++;
        tokens.push(
          token(char, TokenType.BinaryOperator, tokenStart, position)
        );
        break;
      case "=":
        src.shift();
        position++;
        tokens.push(token("=", TokenType.Equals, tokenStart, position));
        break;
      case ";":
        src.shift();
        position++;
        tokens.push(token(";", TokenType.Semicolon, tokenStart, position));
        break;
      case ",":
        src.shift();
        position++;
        tokens.push(token(",", TokenType.Comma, tokenStart, position));
        break;
      case ":":
        src.shift();
        position++;
        tokens.push(token(":", TokenType.Colon, tokenStart, position));
        break;
      case ".":
        src.shift();
        position++;
        tokens.push(token(".", TokenType.Dot, tokenStart, position));
        break;
      default:
        // Handle multicharacter tokens
        if (isInt(char)) {
          let num = "";
          while (src.length > 0 && isInt(src[0]!)) {
            num += src.shift();
            position++;
          }
          tokens.push(token(num, TokenType.Number, tokenStart, position));
        } else if (isAlpha(char)) {
          let ident = "";
          while (src.length > 0 && isAlphaNumeric(src[0]!)) {
            ident += src.shift();
            position++;
          }
          // Check for reserved keywords
          const reserved = KEYWORDS[ident];
          if (typeof reserved === "number") {
            tokens.push(token(ident, reserved, tokenStart, position));
          } else {
            // It's an identifier
            tokens.push(
              token(ident, TokenType.Identifier, tokenStart, position)
            );
          }
        } else if (char === '"' || char === "'") {
          const quoteChar = char;
          src.shift(); // Remove opening quote
          position++;
          let strLit = "";
          while (src.length > 0 && src[0] !== quoteChar) {
            const ch = src.shift()!;
            strLit += ch;
            position++;
          }
          src.shift(); // Remove closing quote
          position++;
          tokens.push(token(strLit, TokenType.String, tokenStart, position));
        } else if (isSkippable(char)) {
          src.shift(); // Skip the current character
          position++;
        } else {
          fatalFmt(
            tokenStart,
            "Unrecognized character '%s' at position %d",
            char,
            position
          );
        }
        break;
    }
  }

  tokens.push(token("EOF", TokenType.EOF, position, position));
  return tokens;
}
