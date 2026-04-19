import type {
  ArrayLiteral,
  Identifier,
  Program,
  Statement,
  TypeAnnotation,
  VariableDeclaration,
} from "../ast";
import type { TypeEnvironment } from "./environment";

export default function typecheck(
  astNode: Statement,
  env: TypeEnvironment,
): TypeAnnotation {
  switch (astNode.kind) {
    case "Program":
      const programNode = astNode as Program;
      let lastType: TypeAnnotation = {
        kind: "TypeAnnotation",
        type: "null",
        isArray: false,
        isOptional: false,
        start: astNode.start,
        end: astNode.end,
      };
      for (const statement of programNode.body) {
        lastType = typecheck(statement, env);
      }
      return lastType;

    case "NumericLiteral":
      return {
        kind: "TypeAnnotation",
        type: "number",
        isArray: false,
        isOptional: false,
        start: astNode.start,
        end: astNode.end,
      };
    case "StringLiteral":
      return {
        kind: "TypeAnnotation",
        type: "string",
        isArray: false,
        isOptional: false,
        start: astNode.start,
        end: astNode.end,
      };
    case "ArrayLiteral": {
      const arrayNode = astNode as ArrayLiteral;

      if (arrayNode.items.length === 0) {
        return {
          kind: "TypeAnnotation",
          type: "array",
          isArray: true,
          isOptional: false,
          start: astNode.start,
          end: astNode.end,
        };
      }

      const firstItemType = typecheck(arrayNode.items[0]!, env);
      for (let i = 1; i < arrayNode.items.length; i++) {
        const itemType = typecheck(arrayNode.items[i]!, env);
        if (
          itemType.type !== firstItemType.type ||
          itemType.isArray !== firstItemType.isArray
        ) {
          throw new Error(
            `Array items must be of the same type. Found ${firstItemType.type} and ${itemType.type}.`,
          );
        }
      }
      return {
        kind: "TypeAnnotation",
        type: firstItemType.type,
        isArray: true,
        isOptional: false,
        start: astNode.start,
        end: astNode.end,
      };
    }
    case "NullLiteral":
      return {
        kind: "TypeAnnotation",
        type: "null",
        isArray: false,
        isOptional: false,
        start: astNode.start,
        end: astNode.end,
      };
    case "Identifier": {
      const varName = (astNode as Identifier).symbol;
      return env.lookupVar(varName, astNode);
    }
    case "VariableDeclaration": {
      return checkVariableDeclaration(astNode, env);
    }

    default:
      throw new Error(
        `Type checking not implemented for node kind: ${astNode.kind}`,
      );
  }
}

function checkVariableDeclaration(
  astNode: Statement,
  env: TypeEnvironment,
): TypeAnnotation {
  const varDecl = astNode as VariableDeclaration;
  const valueType: TypeAnnotation = varDecl.value
    ? typecheck(varDecl.value, env)
    : {
        kind: "TypeAnnotation",
        type: "null",
        isArray: false,
        isOptional: false,
        start: astNode.start,
        end: astNode.end,
      };

  if (varDecl.type) {
    if (varDecl.type.type !== valueType.type) {
      throw new Error(
        `Type annotation mismatch: variable ${varDecl.identifier} is annotated as ${varDecl.type.type} but assigned a value of type ${valueType.type}.`,
      );
    }
  }

  env.declareVar(varDecl.identifier, valueType, astNode);

  return valueType;
}
