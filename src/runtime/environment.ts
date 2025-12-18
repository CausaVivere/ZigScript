import type { Env } from "bun";
import { fatalFmt } from "../utils";
import {
  MK_BOOL,
  MK_NATIVE_FN,
  MK_NULL,
  MK_NUMBER,
  type RuntimeValue,
} from "./values";
import type { Statement } from "../frontend/ast";

export function createGlobalEnvironment() {
  const env = new Environment();
  env.declareVar("true", MK_BOOL(true), true);
  env.declareVar("false", MK_BOOL(false), true);
  env.declareVar("null", MK_NULL(), true);

  // Define a native builtin method
  env.declareVar(
    "print",
    MK_NATIVE_FN((args, scope) => {
      console.log(...args);
      return MK_NULL();
    }),
    true
  );

  const timeFunction = (args: RuntimeValue[], env: Environment) => {
    return MK_NUMBER(Date.now());
  };
  env.declareVar("time", MK_NATIVE_FN(timeFunction), true);

  return env;
}

export default class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeValue>;
  private constants: Set<string>;

  constructor(parentENV?: Environment) {
    const global = parentENV ? true : false;
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
  }

  public declareVar(
    varName: string,
    value: RuntimeValue,
    constant: boolean,
    astNode?: Statement
  ): RuntimeValue {
    if (this.variables.has(varName)) {
      fatalFmt(
        astNode?.start ?? 0,
        "Variable %s is already declared in this scope.",
        varName
      );
    }
    this.variables.set(varName, value);

    if (constant) {
      this.constants.add(varName);
    }
    return value;
  }

  public assignVar(
    varName: string,
    value: RuntimeValue,
    astNode?: Statement
  ): RuntimeValue {
    const env = this.resolve(varName, astNode);
    if (env.constants.has(varName)) {
      fatalFmt(
        astNode?.start ?? 0,
        "Cannot assign to constant variable %s.",
        varName
      );
    }
    env.variables.set(varName, value);
    return value;
  }

  public lookupVar(varName: string, astNode?: Statement): RuntimeValue {
    const env = this.resolve(varName, astNode);
    return env.variables.get(varName)!;
  }

  public resolve(varName: string, astNode?: Statement): Environment {
    if (this.variables.has(varName)) {
      return this;
    }
    if (this.parent === undefined) {
      fatalFmt(
        astNode?.start ?? 0,
        "Cannot resolve %s as it does not exist.",
        varName
      );
    }

    return this.parent.resolve(varName, astNode);
  }
}
