import { fatalFmt } from "../../utils";
import {
  TYPE_STRINGS,
  type ArrayLiteral,
  type BinaryExpression,
  type FunctionDeclaration,
  type Identifier,
  type Program,
  type ReturnStatement,
  type Statement,
  type TYPE,
  type TypeAnnotation,
  type VariableDeclaration,
} from "../ast";
import { TypeEnvironment } from "./environment";

export default function typecheck(
  astNode: Statement,
  env: TypeEnvironment,
): TypeAnnotation {
  switch (astNode.kind) {
    case "Program":
      const programNode = astNode as Program;
      let lastType: TypeAnnotation = createTypeAnnotation(astNode, ["null"]);
      for (const statement of programNode.body) {
        lastType = typecheck(statement, env);
      }
      return lastType;

    case "NumericLiteral":
      return createTypeAnnotation(astNode, ["number"]);
    case "StringLiteral":
      return createTypeAnnotation(astNode, ["string"]);
    case "ArrayLiteral": {
      const arrayNode = astNode as ArrayLiteral;

      if (arrayNode.items.length === 0) {
        return createTypeAnnotation(astNode, ["array"], true, false);
      }

      const firstItemType = typecheck(arrayNode.items[0]!, env);
      for (let i = 1; i < arrayNode.items.length; i++) {
        const itemType = typecheck(arrayNode.items[i]!, env);
        if (!areEquivalentTypes(itemType, firstItemType)) {
          throw new Error(
            `Array items must be of the same type. Found ${formatType(firstItemType)} and ${formatType(itemType)}.`,
          );
        }
      }
      return createTypeAnnotation(astNode, firstItemType.types, true, false);
    }
    case "NullLiteral":
      return createTypeAnnotation(astNode, ["null"]);
    case "Identifier": {
      const varName = (astNode as Identifier).symbol;
      return env.lookupVar(varName, astNode);
    }
    case "VariableDeclaration": {
      return checkVariableDeclaration(astNode, env);
    }
    case "FunctionDeclaration": {
      return checkFunctionDeclaration(astNode, env);
    }
    case "WhileDeclaration":
    case "ConditionalDeclaration":
      return checkBodyWithControlFlow(astNode, env);
    case "LogicalExpr":
      return createTypeAnnotation(astNode, ["boolean"]);
    case "UnaryExpr": {
      const unaryNode = astNode as any; // Could be UnaryExpression or ComparisonExpression
      if (unaryNode.operator === "!") {
        return createTypeAnnotation(astNode, ["boolean"]);
      } else {
        return createTypeAnnotation(astNode, ["number"]);
      }
    }
    case "BinaryExpr":
      return checkBinaryExpression(astNode, env);
    case "Break":
    case "Continue":
    case "Return":
      return createTypeAnnotation(astNode, ["noreturn"]);

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
    : createTypeAnnotation(astNode, ["null"]);

  const finalType = varDecl.type ?? valueType;

  if (varDecl.type) {
    if (!isAssignable(valueType, varDecl.type)) {
      throw new Error(
        `Type annotation mismatch: variable ${varDecl.identifier} is annotated as ${formatType(varDecl.type)} but assigned a value of type ${formatType(valueType)}.`,
      );
    }
  }

  env.declareVar(varDecl.identifier, finalType, astNode);

  return finalType;
}

function checkFunctionDeclaration(
  astNode: Statement,
  env: TypeEnvironment,
): TypeAnnotation {
  const decl = astNode as FunctionDeclaration;
  decl.parameters.forEach((param) => {
    if (!param.type) {
      throw new Error(
        `Parameter ${param.name} in function ${decl.name} is missing a type annotation.`,
      );
    }
  });

  const functionEnv = new TypeEnvironment(env);
  decl.parameters.forEach((param) => {
    functionEnv.declareVar(param.name, param.type, astNode);
  });

  const returnTypes: TypeAnnotation[] = [];

  decl.body.forEach((stmt) => {
    if (stmt.kind === "Return") {
      const returnStmt = stmt as ReturnStatement;

      if (!returnStmt.value) {
        returnTypes.push(createTypeAnnotation(stmt, ["void"]));
      } else {
        returnTypes.push(typecheck(returnStmt.value, functionEnv));
      }
      return;
    }
    typecheck(stmt, functionEnv);
  });

  let inferredReturnType: TypeAnnotation;

  if (returnTypes.length === 0) {
    inferredReturnType = createTypeAnnotation(astNode, ["void"]);
  } else {
    const first = returnTypes[0]!;
    const unionTypes = [...first.types];

    for (let i = 1; i < returnTypes.length; i++) {
      const current = returnTypes[i]!;

      if (
        current.isArray !== first.isArray ||
        current.isOptional !== first.isOptional
      ) {
        throw new Error(
          `Inconsistent return shape in function ${decl.name}: ${formatType(first)} and ${formatType(current)}.`,
        );
      }

      for (const type of current.types) {
        if (!unionTypes.includes(type)) {
          unionTypes.push(type);
        }
      }
    }

    inferredReturnType = createTypeAnnotation(
      astNode,
      unionTypes,
      first.isArray,
      first.isOptional,
    );
  }

  const declaredOrInferredReturn = decl.returnType ?? inferredReturnType;

  if (decl.returnType && !isAssignable(inferredReturnType, decl.returnType)) {
    throw new Error(
      `Return type annotation mismatch in function ${decl.name}: annotated as ${formatType(decl.returnType)} but found return type ${formatType(inferredReturnType)}.`,
    );
  }

  if (!validateTypeAnnotation(declaredOrInferredReturn)) {
    throw new Error(
      `Invalid return type ${formatType(declaredOrInferredReturn)} in function ${decl.name}.`,
    );
  }

  env.declareVar(decl.name, declaredOrInferredReturn, astNode);

  return createTypeAnnotation(
    astNode,
    declaredOrInferredReturn.types,
    declaredOrInferredReturn.isArray,
    declaredOrInferredReturn.isOptional,
  );
}

function checkBodyWithControlFlow(
  astNode: Statement,
  env: TypeEnvironment,
): TypeAnnotation {
  const decl = astNode as any; // Could be ConditionalDeclaration or WhileDeclaration
  const bodyEnv = new TypeEnvironment(env);
  const bodyTypes: TypeAnnotation[] = [];

  decl.body.forEach((stmt: Statement) => {
    bodyTypes.push(typecheck(stmt, bodyEnv));
  });

  if (bodyTypes.length === 0) {
    return createTypeAnnotation(astNode, ["null"]);
  }

  const first = bodyTypes[0]!;
  const unionTypes = [...first.types];

  for (let i = 1; i < bodyTypes.length; i++) {
    const current = bodyTypes[i]!;

    if (
      current.isArray !== first.isArray ||
      current.isOptional !== first.isOptional
    ) {
      throw new Error(
        `Inconsistent types in control flow body: ${formatType(first)} and ${formatType(current)}.`,
      );
    }

    for (const type of current.types) {
      if (!unionTypes.includes(type)) {
        unionTypes.push(type);
      }
    }
  }

  return createTypeAnnotation(
    astNode,
    unionTypes,
    first.isArray,
    first.isOptional,
  );
}

function checkBinaryExpression(
  astNode: Statement,
  env: TypeEnvironment,
): TypeAnnotation {
  const binaryNode = astNode as BinaryExpression;
  const leftType = typecheck(binaryNode.left, env);
  const rightType = typecheck(binaryNode.right, env);

  if (leftType.types.includes("array") || rightType.types.includes("array")) {
    return fatalFmt(
      astNode.start,
      "Binary operator '%s' cannot be used with arrays. Use array methods like concat(), map(), or iterate manually.",
      binaryNode.operator,
    );
  }

  // string concatenation
  if (leftType.types.includes("string") || rightType.types.includes("string")) {
    if (binaryNode.operator === "+") {
      return createTypeAnnotation(astNode, ["string"]);
    }
    fatalFmt(
      binaryNode.start,
      "Cannot use operator '%s' with strings",
      binaryNode.operator,
    );
  }

  // numeric operations
  if (leftType.types.includes("number") || rightType.types.includes("number"))
    return createTypeAnnotation(astNode, ["number"]);

  fatalFmt(
    astNode.start,
    `Operator '${binaryNode.operator}' cannot be applied to types ${formatType(leftType)} and ${formatType(rightType)}.`,
  );
}

// UTILS

export function validateTypeString(type: string): boolean {
  return TYPE_STRINGS.includes(type);
}

function createTypeAnnotation(
  astNode: Statement,
  types: TYPE[],
  isArray = false,
  isOptional = false,
): TypeAnnotation {
  return {
    kind: "TypeAnnotation",
    types: [...new Set(types)],
    isArray,
    isOptional,
    start: astNode.start,
    end: astNode.end,
  };
}

function formatType(annotation: TypeAnnotation): string {
  const typeList = annotation.types.join(" | ");
  const arraySuffix = annotation.isArray ? "[]" : "";
  const optionalSuffix = annotation.isOptional ? "?" : "";
  return `${typeList}${arraySuffix}${optionalSuffix}`;
}

function areEquivalentTypes(a: TypeAnnotation, b: TypeAnnotation): boolean {
  if (a.isArray !== b.isArray || a.isOptional !== b.isOptional) {
    return false;
  }

  if (a.types.length !== b.types.length) {
    return false;
  }

  return a.types.every((type) => b.types.includes(type));
}

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

function validateTypeAnnotation(type: TypeAnnotation): boolean {
  return type.types.every((entry) => validateTypeString(entry));
}
