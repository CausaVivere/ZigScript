import {
  type RuntimeValue,
  type NumberValue,
  MK_NULL,
  type StringValue,
  type ArrayValue,
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
  ConditionalDeclaration,
  ComparisonExpression,
  MemberExpression,
  LogicalExpression,
  UnaryExpression,
  WhileDeclaration,
  ContinueStatement,
  BreakStatement,
  ReturnStatement,
  ArrayLiteral,
} from "../frontend/ast";
import type Environment from "./environment";
import {
  evaluate_identifier,
  evaluate_binary_expression,
  evaluate_assignment_expression,
  evaluate_object_expression,
  evaluate_call_expression,
  evaluate_comparison_expression,
  evaluate_member_expression,
  evaluate_logical_expression,
  evaluate_unary_expression,
} from "./eval/expressions";
import {
  evaluate_break_statement,
  evaluate_conditional_declaration,
  evaluate_continue_statement,
  evaluate_function_declaration,
  evaluate_program,
  evaluate_return_statement,
  evaluate_variable_declaration,
  evaluate_while_declaration,
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
    case "ArrayLiteral": {
      return {
        type: "array",
        value: (astNode as ArrayLiteral).items.map((item) =>
          evaluate(item, env)
        ),
      } as ArrayValue;
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

    case "MemberExpr":
      return evaluate_member_expression(astNode as MemberExpression, env);

    case "Program":
      return evaluate_program(astNode as Program, env);

    // Handle statements

    case "VariableDeclaration": {
      return evaluate_variable_declaration(astNode as VariableDeclaration, env);
    }

    case "FunctionDeclaration": {
      return evaluate_function_declaration(astNode as FunctionDeclaration, env);
    }

    case "ConditionalDeclaration": {
      return evaluate_conditional_declaration(
        astNode as ConditionalDeclaration,
        env
      );
    }

    case "ComparisonExpr": {
      return evaluate_comparison_expression(
        astNode as ComparisonExpression,
        env
      );
    }

    case "LogicalExpr":
      return evaluate_logical_expression(astNode as LogicalExpression, env);

    case "UnaryExpr":
      return evaluate_unary_expression(astNode as UnaryExpression, env);

    case "WhileDeclaration":
      return evaluate_while_declaration(astNode as WhileDeclaration, env);

    case "Break":
      return evaluate_break_statement(astNode as BreakStatement, env);

    case "Continue":
      return evaluate_continue_statement(astNode as ContinueStatement, env);

    case "Return":
      return evaluate_return_statement(astNode as ReturnStatement, env);

    default: {
      fatalFmt(
        astNode.start,
        "This AST Node has not yet been implemented for interpretation %s",
        JSON.stringify(astNode, null, 2)
      );
    }
  }
}
