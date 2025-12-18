# ZigScript - Complete Source Code

This file contains all the source code for the ZigScript interpreter in one place for easy reference and context.

---

## package.json

```json
{
  "name": "zigscript",
  "private": true,
  "scripts": {
    "build": "bun build src/main.ts --outdir=dist --target=netlify",
    "start": "bun run src/main.ts"
  },
  "devDependencies": {
    "@types/bun": "^1.3.4"
  },
  "peerDependencies": {
    "typescript": "^5"
  }
}
```

---

## src/utils.ts

```typescript
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
```

---

## src/frontend/ast.ts

```typescript
// Abstract Syntax Tree

export type NodeType =
  // Statements
  | "Program"
  | "VariableDeclaration"
  | "FunctionDeclaration"

  // Expressions
  | "AssignmentExpr"
  | "BinaryExpr"
  | "MemberExpr"
  | "CallExpr"

  // Literals / Primary Expressions
  | "NumericLiteral"
  | "StringLiteral"
  | "Identifier"
  | "Property"
  | "ObjectLiteral";

/**
 * Statements do not result in a value at runtime.
 They contain one or more expressions internally */
export interface Statement {
  kind: NodeType;
}

/**
 * Defines a block which contains many statements.
 * -  Only one program will be contained in a file.
 */
export interface Program extends Statement {
  kind: "Program";
  body: Statement[];
}

export interface VariableDeclaration extends Statement {
  kind: "VariableDeclaration";
  constant: boolean;
  identifier: string;
  value?: Expression;
}

/**  Expressions will result in a value at runtime unlike Statements */
export interface Expression extends Statement {}

/**
 * A operation with two sides seperated by a operator.
 * Both sides can be ANY Complex Expression.
 * - Supported Operators -> + | - | / | * | %
 */
export interface BinaryExpression extends Expression {
  kind: "BinaryExpr";
  operator: string;
  left: Expression;
  right: Expression;
}

export interface CallExpression extends Expression {
  kind: "CallExpr";
  args: Expression[];
  caller: Expression;
}

export interface MemberExpression extends Expression {
  kind: "MemberExpr";
  object: Expression;
  property: Expression;
  computed: boolean;
}

// LITERAL / PRIMARY EXPRESSION TYPES
/**
 * Represents a user-defined variable or symbol in source.
 */
export interface Identifier extends Expression {
  kind: "Identifier";
  symbol: string;
}

/**
 * Represents a numeric constant inside the soure code.
 */
export interface NumericLiteral extends Expression {
  kind: "NumericLiteral";
  value: number;
}

export interface StringLiteral extends Expression {
  kind: "StringLiteral";
  value: string;
}

export interface AssignmentExpression extends Expression {
  kind: "AssignmentExpr";
  assignee: Expression;
  value: Expression;
}

export interface Property extends Expression {
  kind: "Property";
  key: string;
  value?: Expression;
}

export interface ObjectLiteral extends Expression {
  kind: "ObjectLiteral";
  properties: Property[];
}

export interface FunctionDeclaration extends Statement {
  kind: "FunctionDeclaration";
  parameters: string[]; // to be changed from string to support types and default values
  name: string;
  body: Statement[];
  arrow: boolean;
}
```

---

## src/frontend/lexer.ts

```typescript
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
          fatalFmt("Unrecognized character found in source code: %s", char);
        }
        break;
    }
  }

  tokens.push(token("EOF", TokenType.EOF));
  return tokens;
}
```

---

## src/frontend/parser.ts

```typescript
import { fatal, fatalFmt } from "../utils.ts";
import {
  type Statement,
  type Program,
  type Expression,
  type BinaryExpression,
  type Identifier,
  type VariableDeclaration,
  type AssignmentExpression,
  type Property,
  type ObjectLiteral,
  type CallExpression,
  type MemberExpression,
  type FunctionDeclaration,
} from "./ast.ts";
import { tokenize, type Token, TokenType } from "./lexer";

export default class Parser {
  private tokens: Token[] = [];

  private not_eof(): boolean {
    return this.tokens[0]!.type !== TokenType.EOF;
  }

  private at() {
    return this.tokens[0] as Token;
  }

  private eat() {
    const prev = this.tokens.shift() as Token;
    return prev;
  }

  private expect(type: TokenType, err: string) {
    const prev = this.tokens.shift() as Token;

    if (!prev || prev.type !== type) {
      fatalFmt("Parser Error:\n %s %o - Expecting: %s", err, prev, type);
    }

    return prev;
  }

  public produceAST(sourceCode: string): Program {
    this.tokens = tokenize(sourceCode);

    const program: Program = {
      kind: "Program",
      body: [],
    };

    while (this.not_eof()) {
      program.body.push(this.parse_statement());
    }

    return program;
  }

  private parse_statement(): Statement {
    switch (this.at().type) {
      case TokenType.Let:
        return this.parse_var_decleration();
      case TokenType.Const:
        return this.parse_var_decleration();
      case TokenType.Function:
        return this.parse_function_declaration();
      default:
        const expr = this.parse_expression();
        // Consume optional semicolon after expression statements
        if (this.at().type === TokenType.Semicolon) {
          this.eat();
        }
        return expr;
    }
  }

  private parse_function_declaration(): Statement {
    this.eat(); // eat function keyword
    const name = this.expect(
      TokenType.Identifier,
      "Expected function name following function keyword."
    ).value;

    const args = this.parse_args();
    const params: string[] = [];

    for (const arg of args) {
      if (arg.kind !== "Identifier") {
        fatalFmt("Function parameters must be identifiers.", arg);
      }
      params.push((arg as Identifier).symbol);
    }

    this.expect(
      TokenType.OpenBrace,
      "Expected function body following declaration"
    );

    const body: Statement[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_statement());
    }

    this.expect(
      TokenType.CloseBrace,
      "Closing brace expected inside function declaration."
    );

    const fn = {
      body,
      name,
      parameters: params,
      kind: "FunctionDeclaration",
      arrow: false,
    } as FunctionDeclaration;

    return fn;
  }

  // LET Identifier;
  // ( LET | CONST ) IDENT = EXPR;
  private parse_var_decleration(): Statement {
    const isConstant = this.eat().type === TokenType.Const;
    const identifier = this.expect(
      TokenType.Identifier,
      `Expected identifier name following ${
        isConstant ? "const" : "let"
      } keyword.`
    ).value;

    if (this.at().type === TokenType.Semicolon) {
      this.eat(); // eat the semicolon

      if (isConstant) {
        fatal("Constant variable declarations must be initialized.");
      }
      return {
        kind: "VariableDeclaration",
        identifier,
        constant: false,
      } as VariableDeclaration;
    }

    this.expect(
      TokenType.Equals,
      "Expected '=' following variable identifier in declaration."
    );

    const declaration = {
      kind: "VariableDeclaration",
      constant: isConstant,
      identifier,
      value: this.parse_expression(),
    } as VariableDeclaration;

    this.expect(
      TokenType.Semicolon,
      "Expected ';' following variable declaration."
    );

    return declaration;
  }

  private parse_expression(): Expression {
    return this.parse_assignment_expression();
  }

  private parse_object_expression(): Expression {
    // { Prop[] }
    if (this.at().type !== TokenType.OpenBrace) {
      return this.parse_additive_expression();
    }

    this.eat(); // advance past open brace.

    const properties = new Array<Property>();

    while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
      // { key: val, key2:val }
      const key = this.expect(
        TokenType.Identifier,
        "Object literal key expected."
      ).value;

      // Allows shorthand key: pair -> { key, }
      if (this.at().type === TokenType.Comma) {
        this.eat(); // advance past comma
        properties.push({
          key,
          kind: "Property",
        } as Property);
        continue;
      }
      // Allows shorthand key: pair -> { key }
      else if (this.at().type === TokenType.CloseBrace) {
        properties.push({
          key,
          kind: "Property",
        } as Property);
        continue;
      }

      // { key: value }
      this.expect(
        TokenType.Colon,
        "Expected ':' following object literal key."
      );
      const value = this.parse_expression();
      properties.push({ kind: "Property", value, key });

      if (this.at().type !== TokenType.CloseBrace) {
        this.expect(
          TokenType.Comma,
          "Expected comma or Closing Bracket following property."
        );
      }
    }

    this.expect(TokenType.CloseBrace, "Object literal missing closing brace.");

    return { kind: "ObjectLiteral", properties } as ObjectLiteral;
  }

  private parse_assignment_expression(): Expression {
    const left = this.parse_object_expression();

    if (this.at().type === TokenType.Equals) {
      this.eat(); // advance past '='
      const value = this.parse_assignment_expression();

      return {
        kind: "AssignmentExpr",
        assignee: left,
        value,
      } as AssignmentExpression;
    }

    return left;
  }

  private parse_additive_expression(): Expression {
    let left = this.parse_multiplicative_expression();

    while (this.at().value === "+" || this.at().value === "-") {
      const operator = this.eat().value;
      const right = this.parse_multiplicative_expression();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  private parse_multiplicative_expression(): Expression {
    let left = this.parse_call_member_expression();

    while (
      this.at().value === "*" ||
      this.at().value === "/" ||
      this.at().value === "%"
    ) {
      const operator = this.eat().value;
      const right = this.parse_primary_expression();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  // foo.x()()
  private parse_call_member_expression(): Expression {
    const member = this.parse_member_expression();

    if (this.at().type === TokenType.OpenParen) {
      return this.parse_call_expression(member);
    }

    return member;
  }

  private parse_call_expression(caller: Expression): Expression {
    let call_expr: Expression = {
      kind: "CallExpr",
      caller,
      args: this.parse_args(),
    } as CallExpression;

    if (this.at().type === TokenType.OpenParen) {
      call_expr = this.parse_call_expression(call_expr);
    }

    return call_expr;
  }

  private parse_args(): Expression[] {
    this.expect(
      TokenType.OpenParen,
      "Expected opening parenthesis for function call arguments."
    );

    const args =
      this.at().type === TokenType.CloseParen
        ? []
        : this.parse_arguments_list();

    this.expect(
      TokenType.CloseParen,
      "Missing closing parenthesis inside arguments list."
    );

    return args;
  }

  private parse_arguments_list(): Expression[] {
    const args = [this.parse_assignment_expression()];

    while (this.at().type === TokenType.Comma && this.eat()) {
      args.push(this.parse_assignment_expression());
    }

    return args;
  }

  private parse_member_expression(): Expression {
    let object = this.parse_primary_expression();

    while (
      this.at().type === TokenType.Dot ||
      this.at().type === TokenType.OpenBracket
    ) {
      const operator = this.eat();
      let property: Expression;
      let computed: boolean;

      // non-computed values aka obj.expr
      if (operator.type === TokenType.Dot) {
        computed = false;
        // get identifier
        property = this.parse_primary_expression();

        if (property.kind !== "Identifier") {
          fatal(
            `Can not use dot operator without right hand side being a identifier`
          );
        }
      } else {
        // this allows obj[computedValue]
        computed = true;
        property = this.parse_expression();

        this.expect(
          TokenType.CloseBracket,
          "Missing closing bracket for computed value."
        );
      }
      object = {
        kind: "MemberExpr",
        object,
        property,
        computed,
      } as MemberExpression;
    }

    return object;
  }

  // Order of Precedence
  // AssignmentExpr
  // ObjectExpr
  // FunctionCall
  // LogicalExpr
  // ComparisonExpr
  // AdditiveExpr
  // MultiplicativeExpr
  // CallExpr
  // MemberExpr
  // UnaryExpr
  // PrimaryExpr

  private parse_primary_expression(): Expression {
    const tk = this.at().type;

    switch (tk) {
      case TokenType.Identifier: {
        return {
          kind: "Identifier",
          symbol: this.eat().value,
        } as Identifier;
      }
      case TokenType.Number: {
        return {
          kind: "NumericLiteral",
          value: parseFloat(this.eat().value),
        } as Expression;
      }
      case TokenType.String: {
        return {
          kind: "StringLiteral",
          value: this.eat().value,
        } as Expression;
      }
      case TokenType.OpenParen: {
        this.eat(); // eat the opening parenthesis
        const value = this.parse_expression();
        this.expect(
          TokenType.CloseParen,
          "Unexpected token found inside parenthesised expression. Expected closing parenthesis."
        );
        return value;
      }
      default: {
        fatalFmt("Unexpected token found during parsing: %o", this.at());
      }
    }
  }
}
```

---

## src/runtime/values.ts

```typescript
import type { Statement } from "../frontend/ast";
import type Environment from "./environment";

export type ValueType =
  | "null"
  | "number"
  | "boolean"
  | "string"
  | "object"
  | "native-fn"
  | "function";

export interface RuntimeValue {
  type: ValueType;
}

export interface NullValue extends RuntimeValue {
  type: "null";
  value: null;
}

export interface NumberValue extends RuntimeValue {
  type: "number";
  value: number;
}

export interface BooleanValue extends RuntimeValue {
  type: "boolean";
  value: boolean;
}

export interface StringValue extends RuntimeValue {
  type: "string";
  value: string;
}

export interface ObjectValue extends RuntimeValue {
  type: "object";
  properties: Map<string, RuntimeValue>;
}

export type FunctionCall = (
  args: RuntimeValue[],
  env: Environment
) => RuntimeValue;

export interface NativeFnValue extends RuntimeValue {
  type: "native-fn";
  call: FunctionCall;
}

export interface FunctionValue extends RuntimeValue {
  type: "function";
  name: string;
  parameters: string[];
  declarationEnv: Environment;
  body: Statement[];
}

export function MK_NATIVE_FN(call: FunctionCall) {
  return { type: "native-fn", call } as NativeFnValue;
}

export function MK_NUMBER(n: number = 0): NumberValue {
  return {
    type: "number",
    value: n,
  } as NumberValue;
}

export function MK_NULL(): NullValue {
  return {
    type: "null",
    value: null,
  } as NullValue;
}

export function MK_BOOL(b: boolean = false): BooleanValue {
  return {
    type: "boolean",
    value: b,
  } as BooleanValue;
}

export function MK_STRING(s: string = ""): StringValue {
  return {
    type: "string",
    value: s,
  } as StringValue;
}
```

---

## src/runtime/environment.ts

```typescript
import { fatalFmt } from "../utils";
import {
  MK_BOOL,
  MK_NATIVE_FN,
  MK_NULL,
  MK_NUMBER,
  type RuntimeValue,
} from "./values";

export function createGlobalEnvironment() {
  const env = new Environment();
  env.declareVar("true", MK_BOOL(true), true);
  env.declareVar("false", MK_BOOL(false), true);
  env.declareVar("null", MK_NULL(), true);

  // Define a native builtin method
  env.declareVar(
    "print",
    MK_NATIVE_FN((args, scope) => {
      console.log(...args);
      return MK_NULL();
    }),
    true
  );

  const timeFunction = (args: RuntimeValue[], env: Environment) => {
    return MK_NUMBER(Date.now());
  };
  env.declareVar("time", MK_NATIVE_FN(timeFunction), true);

  return env;
}

export default class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeValue>;
  private constants: Set<string>;

  constructor(parentENV?: Environment) {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
  }

  public declareVar(
    varName: string,
    value: RuntimeValue,
    constant: boolean
  ): RuntimeValue {
    if (this.variables.has(varName)) {
      fatalFmt("Variable %s is already declared in this scope.", varName);
    }
    this.variables.set(varName, value);

    if (constant) {
      this.constants.add(varName);
    }
    return value;
  }

  public assignVar(varName: string, value: RuntimeValue): RuntimeValue {
    const env = this.resolve(varName);
    if (env.constants.has(varName)) {
      fatalFmt("Cannot assign to constant variable %s.", varName);
    }
    env.variables.set(varName, value);
    return value;
  }

  public lookupVar(varName: string): RuntimeValue {
    const env = this.resolve(varName);
    return env.variables.get(varName)!;
  }

  public resolve(varName: string): Environment {
    if (this.variables.has(varName)) {
      return this;
    }
    if (this.parent === undefined) {
      fatalFmt("Cannot resolve %s as it does not exist.", varName);
    }

    return this.parent.resolve(varName);
  }
}
```

---

## src/runtime/interpreter.ts

```typescript
import {
  type RuntimeValue,
  type NumberValue,
  MK_NULL,
  type StringValue,
} from "./values";
import type {
  BinaryExpression,
  NumericLiteral,
  Program,
  Statement,
  Identifier,
  VariableDeclaration,
  AssignmentExpression,
  ObjectLiteral,
  StringLiteral,
  CallExpression,
  FunctionDeclaration,
} from "../frontend/ast";
import type Environment from "./environment";
import {
  evaluate_identifier,
  evaluate_binary_expression,
  evaluate_assignment_expression,
  evaluate_object_expression,
  evaluate_call_expression,
} from "./eval/expressions";
import {
  evaluate_function_declaration,
  evaluate_program,
  evaluate_variable_declaration,
} from "./eval/statements";
import { fatalFmt } from "../utils";

export function evaluate(astNode: Statement, env: Environment): RuntimeValue {
  switch (astNode.kind) {
    case "NumericLiteral":
      return {
        value: (astNode as NumericLiteral).value,
        type: "number",
      } as NumberValue;
    case "StringLiteral": {
      const strVal = (astNode as StringLiteral).value;
      return {
        type: "string",
        value: strVal,
      } as StringValue;
    }
    case "Identifier": {
      return evaluate_identifier(astNode as Identifier, env);
    }
    case "ObjectLiteral":
      return evaluate_object_expression(astNode as ObjectLiteral, env);
    case "CallExpr":
      return evaluate_call_expression(astNode as CallExpression, env);
    case "BinaryExpr":
      return evaluate_binary_expression(astNode as BinaryExpression, env);
    case "AssignmentExpr":
      return evaluate_assignment_expression(
        astNode as AssignmentExpression,
        env
      );
    case "Program":
      return evaluate_program(astNode as Program, env);

    // Handle statements

    case "VariableDeclaration": {
      return evaluate_variable_declaration(astNode as VariableDeclaration, env);
    }

    case "FunctionDeclaration": {
      return evaluate_function_declaration(astNode as FunctionDeclaration, env);
    }

    default: {
      fatalFmt(
        "This AST Node has not yet been implemented for interpretation %s",
        JSON.stringify(astNode, null, 2)
      );
    }
  }
}
```

---

## src/runtime/eval/expressions.ts

```typescript
import type {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  Identifier,
  ObjectLiteral,
} from "../../frontend/ast";
import { fatalFmt } from "../../utils";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import {
  type FunctionValue,
  type NativeFnValue,
  type NumberValue,
  type ObjectValue,
  type RuntimeValue,
  MK_NULL,
} from "../values";

export function evaluate_numeric_binary_expression(
  lhs: NumberValue,
  rhs: NumberValue,
  operator: string
): NumberValue {
  let result = 0;
  switch (operator) {
    case "+":
      result = lhs.value + rhs.value;
      break;
    case "-":
      result = lhs.value - rhs.value;
      break;
    case "*":
      result = lhs.value * rhs.value;
      break;
    case "/":
      result = lhs.value / rhs.value;
      break;
    case "%":
      result = lhs.value % rhs.value;
      break;
    default:
      break;
  }

  return { value: result, type: "number" } as NumberValue;
}

export function evaluate_binary_expression(
  binop: BinaryExpression,
  env: Environment
): RuntimeValue {
  const leftHandSide = evaluate(binop.left, env);
  const rightHandSide = evaluate(binop.right, env);

  if (leftHandSide.type === "number" || rightHandSide.type === "number") {
    return evaluate_numeric_binary_expression(
      leftHandSide as NumberValue,
      rightHandSide as NumberValue,
      binop.operator
    );
  }

  return MK_NULL();
}

export function evaluate_identifier(
  ident: Identifier,
  env: Environment
): RuntimeValue {
  return env.lookupVar(ident.symbol);
}

export function evaluate_assignment_expression(
  node: AssignmentExpression,
  env: Environment
): RuntimeValue {
  if (node.assignee.kind !== "Identifier") {
    fatalFmt(
      "Invalid Left Hand Side in Assignment Expression: %s",
      JSON.stringify(node.assignee)
    );
  }
  const varName = (node.assignee as Identifier).symbol;
  return env.assignVar(varName, evaluate(node.value, env));
}

export function evaluate_object_expression(
  obj: ObjectLiteral,
  env: Environment
): RuntimeValue {
  const object = {
    type: "object",
    properties: new Map<string, RuntimeValue>(),
  } as ObjectValue;

  for (const { key, value } of obj.properties) {
    const RuntimeValue =
      value === undefined ? env.lookupVar(key) : evaluate(value, env);

    if (object.properties.has(key)) {
      fatalFmt("Duplicate key '%s' found in object literal.", key);
    }
    object.properties.set(key, RuntimeValue);
  }

  return object;
}

export function evaluate_call_expression(
  expr: CallExpression,
  env: Environment
): RuntimeValue {
  const args = expr.args.map((arg) => evaluate(arg, env));
  const fn = evaluate(expr.caller, env);

  if (fn.type === "native-fn") {
    const result = (fn as NativeFnValue).call(args, env);
    return result;
  }

  if (fn.type === "function") {
    const func = fn as FunctionValue;

    const scope = new Environment(func.declarationEnv);

    // Verify arity of function
    if (args.length !== func.parameters.length) {
      fatalFmt(
        "Function expects %d arguments but received %d",
        func.parameters.length,
        args.length
      );
    }

    // Create the variables for the parameters list
    for (let i = 0; i < func.parameters.length; i++) {
      const varname = func.parameters[i];
      scope.declareVar(varname!, args[i]!, false);
    }

    let result: RuntimeValue = MK_NULL();
    for (const statement of func.body) {
      result = evaluate(statement, scope);
    }

    return result;
  }

  fatalFmt("Can not call value that is not a function: ", JSON.stringify(fn));
}
```

---

## src/runtime/eval/statements.ts

```typescript
import type {
  FunctionDeclaration,
  Program,
  VariableDeclaration,
} from "../../frontend/ast";
import type Environment from "../environment";
import { evaluate } from "../interpreter";
import { type FunctionValue, type RuntimeValue, MK_NULL } from "../values";

export function evaluate_program(
  program: Program,
  env: Environment
): RuntimeValue {
  let lastEvaluated: RuntimeValue = MK_NULL();

  for (const statement of program.body) {
    lastEvaluated = evaluate(statement, env);
  }

  return lastEvaluated;
}

export function evaluate_variable_declaration(
  declaration: VariableDeclaration,
  env: Environment
): RuntimeValue {
  const value = declaration.value
    ? evaluate(declaration.value, env)
    : MK_NULL();
  return env.declareVar(declaration.identifier, value, declaration.constant);
}

export function evaluate_function_declaration(
  declaration: FunctionDeclaration,
  env: Environment
): RuntimeValue {
  const fn = {
    type: "function",
    name: declaration.name,
    parameters: declaration.parameters,
    declarationEnv: env,
    body: declaration.body,
  } as FunctionValue;

  return env.declareVar(declaration.name, fn, true);
}
```

---

## src/main.ts

```typescript
import Parser from "./frontend/parser";
import Environment, { createGlobalEnvironment } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";

// repl();
run("./test.txt");

async function run(fileName: string) {
  const sourceCode = await Bun.file(fileName).text();

  const parser = new Parser();
  const program = parser.produceAST(sourceCode);

  const env = createGlobalEnvironment();

  const result = evaluate(program, env);
}

function repl() {
  const parser = new Parser();
  const env = createGlobalEnvironment();

  console.log("\nRepl v0.1");
  while (true) {
    const input = prompt(">> ");

    if (!input || input.includes("exit")) {
      process.exit(1);
    }

    const program = parser.produceAST(input);
    console.log(JSON.stringify(program, null, 2));

    const result = evaluate(program, env);
    console.log(result);

    console.log("---------------");
  }
}
```

---

## Example Test File (test.txt)

```javascript
const foo = "bar";

const obj = {
  x: 100,
  y: 32,
  foo,
  complex: {
    foo: "'foo'",
    bar: '"bar"',
  },
};

print(foo, (45 / 2) * 3);

const timeNow = time();

print(timeNow);

function makeAdder(offset) {
  function add(x, y) {
    x + y + offset;
  }
  add;
}

const adder = makeAdder(1);

print(adder(10, 5));

function sub() {
  function add(x, y) {
    let result = x + y;
    print(result);
    result;
  }
  let foo = 45;
}
```
