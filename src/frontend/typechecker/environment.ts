import { fatalFmt } from "../../utils";
import type { Statement, TypeAnnotation } from "../ast";

function isAssignable(source: TypeAnnotation, target: TypeAnnotation): boolean {
  if (source.isArray !== target.isArray) {
    return false;
  }

  if (source.isOptional && !target.isOptional) {
    return false;
  }

  if (
    source.isArray &&
    source.types.length === 1 &&
    source.types[0] === "array"
  ) {
    return true;
  }

  return source.types.every((type) => target.types.includes(type));
}

function formatType(annotation: TypeAnnotation): string {
  const typeList = annotation.types.join(" | ");
  const arraySuffix = annotation.isArray ? "[]" : "";
  const optionalSuffix = annotation.isOptional ? "?" : "";
  return `${typeList}${arraySuffix}${optionalSuffix}`;
}

export class TypeEnvironment {
  private parent?: TypeEnvironment;
  private variables: Map<string, TypeAnnotation>;

  constructor(parentENV?: TypeEnvironment) {
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
      if (!isAssignable(value, existingType)) {
        fatalFmt(
          astNode?.start ?? 0,
          "Type mismatch: cannot assign %s to variable %s of type %s.",
          formatType(value),
          varName,
          formatType(existingType),
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
