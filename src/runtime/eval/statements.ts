import type {
  BreakStatement,
  ConditionalDeclaration,
  ContinueStatement,
  FunctionDeclaration,
  Program,
  ReturnStatement,
  VariableDeclaration,
  WhileDeclaration,
} from "../../frontend/ast";
import type Environment from "../environment";
import { evaluate } from "../interpreter";
import {
  type BreakValue,
  type FunctionValue,
  type RuntimeValue,
  MK_BREAK,
  MK_CONTINUE,
  MK_NULL,
  MK_RETURN,
} from "../values";
import { is_truthy } from "./expressions";

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
  return env.declareVar(
    declaration.identifier,
    value,
    declaration.constant,
    declaration
  );
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

  return env.declareVar(declaration.name, fn, true, declaration);
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

export function evaluate_while_declaration(
  expr: WhileDeclaration,
  env: Environment
): RuntimeValue {
  let result: RuntimeValue = MK_NULL();

  while (is_truthy(evaluate(expr.condition, env))) {
    for (const statement of expr.body) {
      result = evaluate(statement, env);

      if (result.type === "break") {
        return (result as BreakValue).value ?? MK_NULL();
      }

      if (result.type === "continue") {
        break;
      }
    }
    if (expr.continueExpr && result.type !== "break")
      evaluate(expr.continueExpr, env);
  }

  return result;
}

export function evaluate_break_statement(
  stmt: BreakStatement,
  env: Environment
): RuntimeValue {
  if (stmt.value) {
    return MK_BREAK(evaluate(stmt.value, env));
  }
  return MK_BREAK();
}

export function evaluate_return_statement(
  stmt: ReturnStatement,
  env: Environment
): RuntimeValue {
  if (stmt.value) {
    return MK_RETURN(evaluate(stmt.value, env));
  }
  return MK_RETURN();
}

export function evaluate_continue_statement(
  stmt: ContinueStatement,
  env: Environment
): RuntimeValue {
  return MK_CONTINUE();
}
