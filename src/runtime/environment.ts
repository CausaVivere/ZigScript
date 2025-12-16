import { MK_BOOL, MK_NULL, type RuntimeValue } from "./values";

export function createGlobalEnvironment() {
  const env = new Environment();
  env.declareVar("true", MK_BOOL(true), true);
  env.declareVar("false", MK_BOOL(false), true);
  env.declareVar("null", MK_NULL(), true);
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
    constant: boolean
  ): RuntimeValue {
    if (this.variables.has(varName)) {
      console.error(`Variable ${varName} is already declared in this scope.`);
      process.exit(1);
    }
    this.variables.set(varName, value);

    if (constant) {
      this.constants.add(varName);
    }
    return value;
  }

  public assignVar(varName: string, value: RuntimeValue): RuntimeValue {
    const env = this.resolve(varName);
    if (env.constants.has(varName)) {
      console.error(`Cannot assign to constant variable ${varName}.`);
      process.exit(1);
    }
    env.variables.set(varName, value);
    return value;
  }

  public lookupVar(varName: string): RuntimeValue {
    const env = this.resolve(varName);
    return env.variables.get(varName)!;
  }

  public resolve(varName: string): Environment {
    if (this.variables.has(varName)) {
      return this;
    }
    if (this.parent === undefined) {
      console.error(`Cannot resolve ${varName} as it does not exist.`);
      process.exit(1);
    }

    return this.parent.resolve(varName);
  }
}
