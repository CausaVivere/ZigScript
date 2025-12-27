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
  | "ArrayLiteral";

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

export interface VariableDeclaration extends Statement {
  kind: "VariableDeclaration";
  constant: boolean;
  identifier: string;
  value?: Expression;
}

export interface FunctionDeclaration extends Statement {
  kind: "FunctionDeclaration";
  parameters: string[]; // to be changed from string to support types and default values
  name: string;
  body: Statement[];
  arrow?: boolean;
}

export interface ConditionalDeclaration extends Statement {
  kind: "ConditionalDeclaration";
  condition: Expression;
  body: Statement[];
  alternate?: Statement[] | ConditionalDeclaration; // Either else block or else-if
}

export interface BreakStatement extends Statement {
  kind: "Break";
  value: Expression;
}

export interface ContinueStatement extends Statement {
  kind: "Continue";
}

export interface ReturnStatement extends Statement {
  kind: "Return";
  value: Expression;
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
