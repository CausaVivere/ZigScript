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
  UnaryExpression,
} from "../../frontend/ast";
import { fatalFmt } from "../../utils";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import {
  type ArrayValue,
  type BooleanValue,
  type FunctionCall,
  type FunctionValue,
  type NativeFnValue,
  type NumberValue,
  type ObjectValue,
  type ReturnValue,
  type RuntimeValue,
  type StringValue,
  MK_BOOL,
  MK_NULL,
  MK_NUMBER,
  MK_RETURN,
  MK_STRING,
} from "../values";
import { arrayMethods, functions, push } from "./array_methods";

export function evaluate_numeric_binary_expression(
  lhs: NumberValue, // Left Hand Side
  rhs: NumberValue, // Right Hand Side
  operator: string,
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
  env: Environment,
): RuntimeValue {
  const leftHandSide = evaluate(binop.left, env);
  const rightHandSide = evaluate(binop.right, env);

  // Reject binary operations on arrays
  if (leftHandSide.type === "array" || rightHandSide.type === "array") {
    fatalFmt(
      binop.start,
      "Binary operator '%s' cannot be used with arrays. Use array methods like concat(), map(), or iterate manually.",
      binop.operator,
    );
  }

  // Handle string concatenation
  if (leftHandSide.type === "string" || rightHandSide.type === "string") {
    if (binop.operator === "+") {
      const leftStr =
        leftHandSide.type === "string"
          ? (leftHandSide as StringValue).value
          : String((leftHandSide as NumberValue).value);
      const rightStr =
        rightHandSide.type === "string"
          ? (rightHandSide as StringValue).value
          : String((rightHandSide as NumberValue).value);
      return MK_STRING(leftStr + rightStr);
    }
    fatalFmt(
      binop.start,
      "Cannot use operator '%s' with strings",
      binop.operator,
    );
  }

  // Numeric Operations
  if (leftHandSide.type === "number" || rightHandSide.type === "number") {
    return evaluate_numeric_binary_expression(
      leftHandSide as NumberValue,
      rightHandSide as NumberValue,
      binop.operator,
    );
  }

  return MK_NULL();
}

export function evaluate_identifier(
  ident: Identifier,
  env: Environment,
): RuntimeValue {
  return env.lookupVar(ident.symbol, ident);
}

export function evaluate_assignment_expression(
  node: AssignmentExpression,
  env: Environment,
): RuntimeValue {
  if (node.assignee.kind !== "Identifier") {
    fatalFmt(
      node.start,
      "Invalid Left Hand Side in Assignment Expression: %s",
      JSON.stringify(node.assignee),
    );
  }
  const varName = (node.assignee as Identifier).symbol;
  return env.assignVar(varName, evaluate(node.value, env), node);
}

export function evaluate_object_expression(
  obj: ObjectLiteral,
  env: Environment,
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
  env: Environment,
): RuntimeValue {
  const object = evaluate(expr.object, env);
  if (object.type !== "object" && object.type !== "array") {
    fatalFmt(
      expr.start,
      "Cannot access property '%s' of non-object or non-array.",
      expr.property,
    );
  }

  if (object.type === "array") {
    if (expr.computed) {
      const array = object as ArrayValue;
      const propertyValue = evaluate(expr.property, env);
      let propertyKey: number;

      if (propertyValue.type === "string") {
        propertyKey = parseInt((propertyValue as StringValue).value);
      } else if (propertyValue.type === "number") {
        propertyKey = (propertyValue as NumberValue).value;
      } else {
        fatalFmt(
          expr.property.start,
          "Property accessor must be a string or number, got: %s",
          propertyValue.type,
        );
      }

      const item = array.value[propertyKey];

      if (!item)
        fatalFmt(
          expr.start,
          "Could not resolve any item in array for property %s",
          propertyKey,
        );

      return item;
    }

    const array = object as ArrayValue;

    // Handle dot notation: arr.push, arr.length, etc.
    if (expr.property.kind === "Identifier") {
      const methodName = (expr.property as Identifier).symbol;

      // Handle length property
      if (methodName === "length") {
        return MK_NUMBER(array.value.length);
      }

      // Handle array methods - return a native function bound to this array
      if (arrayMethods.includes(methodName)) {
        return {
          type: "native-fn",
          call: (args: RuntimeValue[], _env: Environment) => {
            return functions[methodName as keyof typeof functions](
              array,
              ...args,
            );
          },
        } as NativeFnValue;
      }

      fatalFmt(expr.start, "Array has no property or method '%s'", methodName);
    }

    fatalFmt(expr.start, "Invalid array access");
  }

  const obj = object as ObjectValue;

  if (expr.computed) {
    const propertyValue = evaluate(expr.property, env);

    let propertyKey: string;

    if (propertyValue.type === "string") {
      propertyKey = (propertyValue as StringValue).value;
    } else if (propertyValue.type === "number") {
      propertyKey = String((propertyValue as NumberValue).value);
    } else {
      fatalFmt(
        expr.property.start,
        "Property accessor must be a string or number, got: %s",
        propertyValue.type,
      );
    }

    const value = obj.properties.get(propertyKey);

    if (!value) {
      fatalFmt(
        expr.start,
        "Property '%s' does not exist on object",
        propertyKey,
      );
    }

    return value;
  }

  if (expr.property.kind !== "Identifier") {
    fatalFmt(
      expr.start,
      "Cannot access property '%s' of non-identifier",
      expr.property,
    );
  }

  const prop = (object as ObjectValue).properties.get(
    (expr.property as Identifier).symbol,
  );
  if (!prop) {
    fatalFmt(
      expr.start,
      "Property '%s' does not exist on object",
      (expr.property as Identifier).symbol,
    );
  }

  return prop;
}

export function evaluate_call_expression(
  expr: CallExpression,
  env: Environment,
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
        args.length,
      );
    }

    // Create the variables for the parameters list
    for (let i = 0; i < func.parameters.length; i++) {
      const varname = func.parameters[i]?.name;
      scope.declareVar(varname!, args[i]!, false, expr);
    }

    let result: RuntimeValue = MK_NULL();
    for (const statement of func.body) {
      result = evaluate(statement, scope);
      if (result.type === "return") {
        return (result as ReturnValue).value ?? MK_NULL();
      }
    }

    return result;
  }

  fatalFmt(
    expr.start,
    "Can not call value that is not a function: ",
    JSON.stringify(fn),
  );
}

export function evaluate_comparison_expression(
  expr: ComparisonExpression,
  env: Environment,
): RuntimeValue {
  const left = evaluate(expr.left, env);
  const right = evaluate(expr.right, env);

  if (left.type !== right.type) {
    fatalFmt(
      expr.start,
      "Cannot compare different types: %s and %s",
      left.type,
      right.type,
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
          expr.operator,
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
          expr.operator,
        );
      default:
        fatalFmt(
          expr.start,
          "Unsupported boolean comparison operator: %s for expression of kind %s",
          expr.operator,
          expr.kind,
        );
    }

    return MK_BOOL(result);
  }

  // All other type combinations are not supported
  fatalFmt(
    expr.start,
    "Cannot compare types: %s and %s",
    left.type,
    right.type,
  );
}

export function evaluate_logical_expression(
  expr: LogicalExpression,
  env: Environment,
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
export function is_truthy(value: RuntimeValue): boolean {
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

export function evaluate_unary_expression(
  expr: UnaryExpression,
  env: Environment,
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
          argument.type,
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
          argument.type,
        );
      }
      return argument; // Just return as-is
    }
    default:
      fatalFmt(expr.start, "Unknown unary operator: %s", expr.operator);
  }
}
