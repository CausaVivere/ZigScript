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
  return env.lookupVar(ident.symbol, ident);
}

export function evaluate_assignment_expression(
  node: AssignmentExpression,
  env: Environment
): RuntimeValue {
  if (node.assignee.kind !== "Identifier") {
    fatalFmt(
      node.start,
      "Invalid Left Hand Side in Assignment Expression: %s",
      JSON.stringify(node.assignee)
    );
  }
  const varName = (node.assignee as Identifier).symbol;
  return env.assignVar(varName, evaluate(node.value, env), node);
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
      value === undefined ? env.lookupVar(key, obj) : evaluate(value, env);

    if (object.properties.has(key)) {
      fatalFmt(obj.start, "Duplicate key '%s' found in object literal.", key);
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
        expr.start,
        "Function expects %d arguments but received %d",
        func.parameters.length,
        args.length
      );
    }

    // Create the variables for the parameters list
    for (let i = 0; i < func.parameters.length; i++) {
      const varname = func.parameters[i];
      scope.declareVar(varname!, args[i]!, false, expr);
    }

    let result: RuntimeValue = MK_NULL();
    for (const statement of func.body) {
      result = evaluate(statement, scope);
    }

    return result;
  }

  fatalFmt(
    expr.start,
    "Can not call value that is not a function: ",
    JSON.stringify(fn)
  );
}
