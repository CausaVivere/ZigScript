import type {
  ConditionalDeclaration,
  FunctionDeclaration,
  Program,
  VariableDeclaration,
} from "../../frontend/ast";
import type Environment from "../environment";
import { evaluate } from "../interpreter";
import { type FunctionValue, type RuntimeValue, MK_NULL } from "../values";

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
