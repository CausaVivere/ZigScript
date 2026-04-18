// Abstract Syntax Tree

export type NodeType =
  // Statements
  | "Program"
  | "VariableDeclaration"
  | "FunctionDeclaration"
  | "ConditionalDeclaration"
  | "ForDeclaration"
  | "WhileDeclaration"
  | "Break"
  | "Continue"
  | "Return"

  // Expressions
  | "AssignmentExpr"
  | "BinaryExpr"
  | "ComparisonExpr"
  | "LogicalExpr"
  | "MemberExpr"
  | "CallExpr"
  | "UnaryExpr"

  // Literals / Primary Expressions
  | "NumericLiteral"
  | "StringLiteral"
  | "Identifier"
  | "Property"
  | "ObjectLiteral"
  | "ArrayLiteral"
  | "TypeAnnotation"
  | "NullLiteral";

export type TYPE =
  | "number"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "i128"
  | "u8"
  | "u16"
  | "u32"
  | "u64"
  | "u128"
  | "f16"
  | "f32"
  | "f64"
  | "f80"
  | "f128"
  | "string"
  | "object"
  | "array"
  | "boolean"
  | "function";

export const TYPE_STRINGS: string[] = [
  "number",
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "f16",
  "f32",
  "f64",
  "f80",
  "f128",
  "string",
  "boolean",
  "object",
  "array",
  "function",
];

/**
 * Statements do not result in a value at runtime.
 They contain one or more expressions internally */
export interface Statement {
  kind: NodeType;
  start: number;
  end: number;
}

/**
 * Defines a block which contains many statements.
 * -  Only one program will be contained in a file.
 */
export interface Program extends Statement {
  kind: "Program";
  body: Statement[];
}

// var x: number = 5; -> TypeAnnotation
export interface TypeAnnotation extends Statement {
  kind: "TypeAnnotation";
  type: TYPE;
  isArray: boolean;
  isOptional: boolean;
}

export interface VariableDeclaration extends Statement {
  kind: "VariableDeclaration";
  constant: boolean;
  identifier: string;
  type?: TypeAnnotation;
  value?: Expression;
}

export interface FunctionDeclaration extends Statement {
  kind: "FunctionDeclaration";
  parameters: Parameter[];
  name: string;
  body: Statement[];
  arrow?: boolean;
  returnType?: TypeAnnotation;
}

export interface Parameter {
  name: string;
  type: TypeAnnotation;
}

export interface ConditionalDeclaration extends Statement {
  kind: "ConditionalDeclaration";
  condition: Expression;
  body: Statement[];
  alternate?: Statement[] | ConditionalDeclaration; // Either else block or else-if
}

export interface BreakStatement extends Statement {
  kind: "Break";
  value?: Expression;
}

export interface ContinueStatement extends Statement {
  kind: "Continue";
}

export interface ReturnStatement extends Statement {
  kind: "Return";
  value?: Expression;
}

export interface WhileDeclaration extends Statement {
  kind: "WhileDeclaration";
  condition: Expression;
  body: Statement[];
  continueExpr?: Expression;
}

// add arrays first
export interface ForDeclaration extends Statement {
  kind: "ForDeclaration";
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
  operator: "+" | "-" | "*" | "/" | "%";
  left: Expression;
  right: Expression;
}

export interface ComparisonExpression extends Expression {
  kind: "ComparisonExpr";
  operator: "<" | "<=" | ">" | ">=" | "==" | "!=";
  left: Expression;
  right: Expression;
}

export interface LogicalExpression extends Expression {
  kind: "LogicalExpr";
  operator: "&&" | "||";
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
  typeAnnotation?: TypeAnnotation;
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

export interface ArrayLiteral extends Expression {
  kind: "ArrayLiteral";
  items: Expression[];
}

export interface NullLiteral extends Expression {
  kind: "NullLiteral";
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

export interface UnaryExpression extends Expression {
  kind: "UnaryExpr";
  operator: "-" | "+" | "!";
  argument: Expression;
}
