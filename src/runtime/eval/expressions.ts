import type { Env } from "bun";
import type {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  ComparisonExpression,
  ConditionalDeclaration,
  Identifier,
  LogicalExpression,
  MemberExpression,
  ObjectLiteral,
  Statement,
} from "../../frontend/ast";
import { fatalFmt } from "../../utils";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import {
  type BooleanValue,
  type FunctionValue,
  type NativeFnValue,
  type NumberValue,
  type ObjectValue,
  type RuntimeValue,
  type StringValue,
  MK_BOOL,
  MK_NULL,
  MK_NUMBER,
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

export function evaluate_member_expression(
  expr: MemberExpression,
  env: Environment
): RuntimeValue {
  const object = evaluate(expr.object, env);
  if (object.type !== "object") {
    fatalFmt(
      expr.start,
      "Cannot access property '%s' of non-object",
      expr.property
    );
  }

  if (expr.property.kind !== "Identifier") {
    fatalFmt(
      expr.start,
      "Cannot access property '%s' of non-identifier",
      expr.property
    );
  }

  const prop = (object as ObjectValue).properties.get(
    (expr.property as Identifier).symbol
  );
  if (!prop) {
    fatalFmt(
      expr.start,
      "Property '%s' does not exist on object",
      (expr.property as Identifier).symbol
    );
  }

  return prop;
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

export function evaluate_comparison_expression(
  expr: ComparisonExpression,
  env: Environment
): RuntimeValue {
  const left = evaluate(expr.left, env);
  const right = evaluate(expr.right, env);

  if (left.type !== right.type) {
    fatalFmt(
      expr.start,
      "Cannot compare different types: %s and %s",
      left.type,
      right.type
    );
  }

  // For now, handle numeric comparisons
  if (left.type === "number" && right.type === "number") {
    const lhs = (left as NumberValue).value;
    const rhs = (right as NumberValue).value;

    let result: boolean;
    switch (expr.operator) {
      case "==":
        result = lhs === rhs;
        break;
      case "!=":
        result = lhs !== rhs;
        break;
      case "<":
        result = lhs < rhs;
        break;
      case ">":
        result = lhs > rhs;
        break;
      case "<=":
        result = lhs <= rhs;
        break;
      case ">=":
        result = lhs >= rhs;
        break;
      default:
        fatalFmt(expr.start, "Unknown comparison operator: %s", expr.operator);
    }

    return MK_BOOL(result);
  } else if (left.type === "string" && right.type === "string") {
    const lhs = (left as StringValue).value;
    const rhs = (right as StringValue).value;

    let result: boolean;
    switch (expr.operator) {
      case "==":
        result = lhs === rhs;
        break;
      case "!=":
        result = lhs !== rhs;
        break;
      case "<":
        result = lhs < rhs;
        break;
      case ">":
        result = lhs > rhs;
        break;
      case "<=":
        result = lhs <= rhs;
        break;
      case ">=":
        result = lhs >= rhs;
        break;
      default:
        fatalFmt(
          expr.start,
          "Unsupported string comparison operator: %s",
          expr.operator
        );
    }

    return MK_BOOL(result);
  } else if (left.type === "boolean" && right.type === "boolean") {
    // Only allow equality checks on booleans, not relational operators
    const lhs = (left as BooleanValue).value;
    const rhs = (right as BooleanValue).value;

    let result: boolean;
    switch (expr.operator) {
      case "==":
        result = lhs === rhs;
        break;
      case "!=":
        result = lhs !== rhs;
        break;
      case "<":
      case ">":
      case "<=":
      case ">=":
        fatalFmt(
          expr.start,
          "Relational operators (%s) are not allowed on boolean values. Use == or != instead.",
          expr.operator
        );
      default:
        fatalFmt(
          expr.start,
          "Unsupported boolean comparison operator: %s for expression of kind %s",
          expr.operator,
          expr.kind
        );
    }

    return MK_BOOL(result);
  }

  // All other type combinations are not supported
  fatalFmt(
    expr.start,
    "Cannot compare types: %s and %s",
    left.type,
    right.type
  );
}

export function evaluate_logical_expression(
  expr: LogicalExpression,
  env: Environment
): RuntimeValue {
  const left = evaluate(expr.left, env);

  // Short-circuit evaluation for &&
  if (expr.operator === "&&") {
    // If left is falsy, don't evaluate right
    if (!is_truthy(left)) {
      return MK_BOOL(false);
    }
    const right = evaluate(expr.right, env);
    return MK_BOOL(is_truthy(right));
  }

  // Short-circuit evaluation for ||
  if (expr.operator === "||") {
    // If left is truthy, don't evaluate right
    if (is_truthy(left)) {
      return MK_BOOL(true);
    }
    const right = evaluate(expr.right, env);
    return MK_BOOL(is_truthy(right));
  }

  fatalFmt(expr.start, "Unknown logical operator: %s", expr.operator);
}

// Helper function to determine truthiness
function is_truthy(value: RuntimeValue): boolean {
  switch (value.type) {
    case "null":
      return false;
    case "boolean":
      return (value as BooleanValue).value;
    case "number":
      return (value as NumberValue).value !== 0;
    case "string":
      return (value as StringValue).value !== "";
    default:
      return true; // Objects, functions are truthy
  }
}

export function evaluate_conditional_declaration(
  expr: ConditionalDeclaration,
  env: Environment
): RuntimeValue {
  const conditionValue = evaluate(expr.condition, env);

  // Use truthiness to determine which branch to take
  if (is_truthy(conditionValue)) {
    // Execute 'if' body
    let result: RuntimeValue = MK_NULL();
    for (const statement of expr.body) {
      result = evaluate(statement, env);
    }
    return result;
  }

  // No else/else-if, return null
  if (!expr.alternate) {
    return MK_NULL();
  }

  // Handle else-if (recursive)
  if (!Array.isArray(expr.alternate)) {
    return evaluate_conditional_declaration(
      expr.alternate as ConditionalDeclaration,
      env
    );
  }

  // Handle else block
  let result: RuntimeValue = MK_NULL();
  for (const statement of expr.alternate) {
    result = evaluate(statement, env);
  }
  return result;
}

// In expressions.ts
import type { UnaryExpression } from "../../frontend/ast";

export function evaluate_unary_expression(
  expr: UnaryExpression,
  env: Environment
): RuntimeValue {
  const argument = evaluate(expr.argument, env);

  switch (expr.operator) {
    case "!": {
      // Logical NOT - convert to boolean and negate
      return MK_BOOL(!is_truthy(argument));
    }
    case "-": {
      // Numeric negation
      if (argument.type !== "number") {
        fatalFmt(
          expr.start,
          "Cannot negate non-numeric value: %s",
          argument.type
        );
      }
      return MK_NUMBER(-(argument as NumberValue).value);
    }
    case "+": {
      // Numeric plus (usually just returns the number)
      if (argument.type !== "number") {
        fatalFmt(
          expr.start,
          "Cannot apply unary + to non-numeric value: %s",
          argument.type
        );
      }
      return argument; // Just return as-is
    }
    default:
      fatalFmt(expr.start, "Unknown unary operator: %s", expr.operator);
  }
}
