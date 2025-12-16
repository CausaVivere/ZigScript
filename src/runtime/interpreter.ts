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
} from "../frontend/ast";
import type Environment from "./environment";
import {
  evaluate_identifier,
  evaluate_binary_expression,
  evaluate_assignment_expression,
  evaluate_object_expression,
} from "./eval/expressions";
import {
  evaluate_program,
  evaluate_variable_declaration,
} from "./eval/statements";

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
    default: {
      console.error(
        "This AST Node has not yet been implemented for interpretation",
        JSON.stringify(astNode, null, 2)
      );
      process.exit(1);
    }
  }
}
