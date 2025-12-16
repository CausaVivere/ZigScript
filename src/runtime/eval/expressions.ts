import type {
  AssignmentExpression,
  BinaryExpression,
  Identifier,
  ObjectLiteral,
} from "../../frontend/ast";
import type Environment from "../environment";
import { evaluate } from "../interpreter";
import {
  type NumberValue,
  type ObjectVal,
  type RuntimeValue,
  MK_NULL,
} from "../values";

export function evaluate_numeric_binary_expression(
  lhs: NumberValue, // Left Hand Side
  rhs: NumberValue, // Right Hand Side
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
      // TODO: Handle division by zero
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
    console.error(
      `Invalid Left Hand Side in Assignment Expression: ${JSON.stringify(
        node.assignee
      )}`
    );
    process.exit(1);
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
  } as ObjectVal;

  for (const { key, value } of obj.properties) {
    const RuntimeValue =
      value === undefined ? env.lookupVar(key) : evaluate(value, env);

    if (object.properties.has(key)) {
      console.error(`Duplicate key '${key}' found in object literal.`);
      process.exit(1);
    }
    object.properties.set(key, RuntimeValue);
  }

  return object;
}
