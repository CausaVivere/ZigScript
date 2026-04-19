import { fatalFmt } from "../../utils";
import type { Statement, TypeAnnotation } from "../ast";

export class TypeEnvironment {
  private parent?: TypeEnvironment;
  private variables: Map<string, TypeAnnotation>;

  constructor(parentENV?: TypeEnvironment) {
    const global = parentENV ? true : false;
    this.parent = parentENV;
    this.variables = new Map();
  }

  public declareVar(
    varName: string,
    value: TypeAnnotation,
    astNode?: Statement,
  ): TypeAnnotation {
    if (this.variables.has(varName)) {
      fatalFmt(
        astNode?.start ?? 0,
        "Variable %s is already declared in this scope.",
        varName,
      );
    }
    this.variables.set(varName, value);

    return value;
  }

  public assignVar(
    varName: string,
    value: TypeAnnotation,
    astNode?: Statement,
  ): TypeAnnotation {
    const env = this.resolve(varName, astNode);

    if (env.variables.has(varName)) {
      const existingType = env.variables.get(varName)!;
      if (existingType.type !== value.type) {
        fatalFmt(
          astNode?.start ?? 0,
          "Type mismatch: cannot assign %s to variable %s of type %s.",
          value.type,
          varName,
          existingType.type,
        );
      }
    }

    env.variables.set(varName, value);
    return value;
  }

  public lookupVar(varName: string, astNode?: Statement): TypeAnnotation {
    const env = this.resolve(varName, astNode);
    return env.variables.get(varName)!;
  }

  public resolve(varName: string, astNode?: Statement): TypeEnvironment {
    if (this.variables.has(varName)) {
      return this;
    }
    if (this.parent === undefined) {
      fatalFmt(
        astNode?.start ?? 0,
        "Cannot resolve %s as it does not exist.",
        varName,
      );
    }

    return this.parent.resolve(varName, astNode);
  }
}
