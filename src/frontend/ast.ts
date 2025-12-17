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
