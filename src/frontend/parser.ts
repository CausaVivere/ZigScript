import { fatal, fatalFmt } from "../utils.ts";
import {
  type Statement,
  type Program,
  type Expression,
  type BinaryExpression,
  type Identifier,
  type VariableDeclaration,
  type AssignmentExpression,
  type Property,
  type ObjectLiteral,
  type CallExpression,
  type MemberExpression,
  type FunctionDeclaration,
  type ConditionalDeclaration,
  type ComparisonExpression,
  type LogicalExpression,
  type ReturnStatement,
  type UnaryExpression,
  type WhileDeclaration,
  type BreakStatement,
  type ArrayLiteral,
  type Parameter,
  type TypeAnnotation,
  TYPE_STRINGS,
} from "./ast.ts";
import { tokenize, type Token, TokenType } from "./lexer";
import type { TYPE } from "./ast";
import { validateTypeString } from "./typechecker/checker.ts";

export default class Parser {
  private tokens: Token[] = [];

  private not_eof(): boolean {
    return this.tokens[0]!.type !== TokenType.EOF;
  }

  private at() {
    return this.tokens[0] as Token;
  }

  private eat() {
    const prev = this.tokens.shift() as Token;

    return prev;
  }

  private expect(type: TokenType, err: string) {
    const prev = this.tokens.shift() as Token;

    if (!prev || prev.type !== type) {
      fatalFmt(
        prev.start,
        "Parser Error Got: %s - Expecting: %s",
        err,
        prev?.value ?? "EOF",
        TokenType[type],
      );
    }

    return prev;
  }

  public produceAST(sourceCode: string): Program {
    this.tokens = tokenize(sourceCode);

    const program: Program = {
      kind: "Program",
      body: [],
      start: 0,
      end: sourceCode.length,
    };

    while (this.not_eof()) {
      program.body.push(this.parse_statement());
    }

    return program;
  }

  private parse_statement(): Statement {
    switch (this.at().type) {
      case TokenType.Let:
        return this.parse_var_decleration();
      case TokenType.Const:
        return this.parse_var_decleration();
      case TokenType.Function:
        return this.parse_function_declaration();
      case TokenType.If:
        return this.parse_conditional_declaration();
      case TokenType.While:
        return this.parse_while_declaration();
      case TokenType.Break: {
        const tok = this.eat();
        if (this.at().type !== TokenType.Semicolon) {
          const value = this.parse_expression();
          this.expect(
            TokenType.Semicolon,
            "Expected ';' following break statement.",
          );

          return {
            kind: "Break",
            value,
            start: tok.start,
            end: this.at().end,
          } as BreakStatement;
        }
        this.expect(
          TokenType.Semicolon,
          "Expected ';' following break statement.",
        );
        return {
          kind: "Break",
          start: tok.start,
          end: tok.end,
        } as BreakStatement;
      }
      case TokenType.Continue: {
        const tok = this.eat();
        this.expect(
          TokenType.Semicolon,
          "Expected ';' following continue statement.",
        );
        return {
          kind: "Continue",
          start: tok.start,
          end: tok.end,
        } as Statement;
      }
      case TokenType.Return: {
        const tok = this.eat();
        const returnStmt: ReturnStatement = {
          kind: "Return",
          value: this.at().value !== ";" ? this.parse_expression() : undefined,
          start: tok.start,
          end: this.at().end,
        };
        this.expect(
          TokenType.Semicolon,
          "Expected ';' following return statement.",
        );
        return returnStmt;
      }
      default:
        const expr = this.parse_expression();
        // Consume optional semicolon after expression statements
        if (this.at().type === TokenType.Semicolon) {
          this.eat();
        }
        return expr;
    }
  }

  private parse_while_declaration(): Statement {
    this.eat(); // eat the while keyword

    this.expect(
      TokenType.OpenParen,
      "Open parenthesis expected after while keyword.",
    );

    let condition = this.parse_expression();

    this.expect(
      TokenType.CloseParen,
      "Close Parenthesis expected after while loop condition.",
    );

    let conditionExpression: Expression | undefined = undefined;

    if (this.at().type == TokenType.Colon) {
      this.eat(); // eat the colon

      this.expect(
        TokenType.OpenParen,
        "Open parenthesis expected after colon for continue expression.",
      );

      conditionExpression = this.parse_expression();

      this.expect(
        TokenType.CloseParen,
        "Close parenthesis expected after while loop continue expression.",
      );
    }

    this.expect(
      TokenType.OpenBrace,
      "Open brace expected for while loop body.",
    );

    let body: Statement[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_statement());
    }

    this.expect(
      TokenType.CloseBrace,
      "Close brace expected for while loop body.",
    );

    return {
      kind: "WhileDeclaration",
      condition,
      continueExpr: conditionExpression,
      body,
      start: condition.start,
      end: this.at().end,
    } as WhileDeclaration;
  }

  private parse_function_declaration(): Statement {
    this.eat(); // eat function keyword
    const name = this.expect(
      TokenType.Identifier,
      "Expected function name following function keyword.",
    ).value;

    const params = this.parse_function_parameters();

    const returnType = this.parse_type_annotation();

    this.expect(
      TokenType.OpenBrace,
      "Expected function body following declaration",
    );

    const body: Statement[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_statement());
    }

    this.expect(
      TokenType.CloseBrace,
      "Closing brace expected inside function declaration.",
    );

    const fn = {
      body,
      name,
      parameters: params,
      kind: "FunctionDeclaration",
      arrow: false,
      returnType,
      start: this.at().start,
      end: this.at().end,
    } as FunctionDeclaration;

    return fn;
  }

  private parse_function_parameters(): Parameter[] {
    this.expect(
      TokenType.OpenParen,
      "Expected opening parenthesis for function parameters.",
    );

    const params: Parameter[] = [];

    if (this.at().type === TokenType.CloseParen) {
      this.eat();
      return params;
    }

    while (this.not_eof() && this.at().type !== TokenType.CloseParen) {
      const nameTok = this.expect(
        TokenType.Identifier,
        "Function parameter name must be an identifier.",
      );

      const type = this.parse_type_annotation();
      if (!type) {
        fatalFmt(
          nameTok.start,
          "Function parameters must have type annotations: %s",
          nameTok.value,
        );
      }

      params.push({
        name: nameTok.value,
        type,
      });

      if (this.at().type === TokenType.Comma) {
        this.eat();
        continue;
      }

      if (this.at().type !== TokenType.CloseParen) {
        fatalFmt(
          this.at().start,
          "Expected ',' or ')' in function parameter list, got '%s'",
          this.at().value,
        );
      }
    }

    this.expect(
      TokenType.CloseParen,
      "Missing closing parenthesis in function parameter list.",
    );

    return params;
  }

  private parse_conditional_declaration(): Statement {
    this.eat(); // advance past if word

    this.expect(TokenType.OpenParen, "Expected '(' following 'if' keyword.");

    const condition = this.parse_expression();

    this.expect(
      TokenType.CloseParen,
      "Expected closing parenthesis following if condition.",
    );

    let body: Statement[] = [];

    if (this.at().type == TokenType.OpenBrace) {
      this.eat();

      while (
        this.at().type !== TokenType.EOF &&
        this.at().type !== TokenType.CloseBrace
      ) {
        body.push(this.parse_statement());
      }

      this.expect(
        TokenType.CloseBrace,
        "Expected closing brace following if statement body.",
      );
    } else {
      body = [this.parse_statement()];
    }

    let alternate: ConditionalDeclaration | Statement[] | undefined = undefined;

    if (this.at().type === TokenType.Else) {
      this.eat();

      if (this.at().type === TokenType.If) {
        // else if - recursively parse as ConditionalDeclaration
        alternate =
          this.parse_conditional_declaration() as ConditionalDeclaration;
      } else {
        // else block - just parse statements
        this.expect(
          TokenType.OpenBrace,
          "Expected opening brace following else keyword.",
        );

        const elseBody: Statement[] = [];
        while (
          this.at().type !== TokenType.EOF &&
          this.at().type !== TokenType.CloseBrace
        ) {
          elseBody.push(this.parse_statement());
        }

        this.expect(
          TokenType.CloseBrace,
          "Expected closing brace following else statement body.",
        );
        alternate = elseBody;
      }
    }

    return {
      kind: "ConditionalDeclaration",
      condition,
      body,
      alternate,
      start: condition.start,
      end: condition.end,
    } as ConditionalDeclaration;
  }

  // LET Identifier;
  // ( LET | CONST ) IDENT = EXPR;
  private parse_var_decleration(): Statement {
    const isConstant = this.eat().type === TokenType.Const;
    const identifier = this.expect(
      TokenType.Identifier,
      `Expected identifier name following ${
        isConstant ? "const" : "let"
      } keyword.`,
    ).value;

    const type = this.parse_type_annotation();

    if (this.at().type === TokenType.Semicolon) {
      this.eat(); // eat the semicolon

      const tok = this.at();
      fatalFmt(tok.start, "Variables declarations must be initialized");
    }

    this.expect(
      TokenType.Equals,
      "Expected '=' following variable identifier in declaration.",
    );

    const declaration = {
      kind: "VariableDeclaration",
      constant: isConstant,
      identifier,
      value: this.parse_expression(),
      type,
    } as VariableDeclaration;

    this.expect(
      TokenType.Semicolon,
      "Expected ';' following variable declaration.",
    );

    return declaration;
  }

  private parse_expression(): Expression {
    return this.parse_assignment_expression();
  }

  // Logical OR - lowest precedence logical operator
  private parse_logical_or_expression(): Expression {
    let left = this.parse_logical_and_expression();

    while (this.at().value === "||") {
      const operator = this.eat().value;
      const right = this.parse_logical_and_expression();

      left = {
        kind: "LogicalExpr",
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as LogicalExpression;
    }

    return left;
  }

  // Logical AND - higher precedence than OR
  private parse_logical_and_expression(): Expression {
    let left = this.parse_equality_expression();

    while (this.at().value === "&&") {
      const operator = this.eat().value;
      const right = this.parse_equality_expression();

      left = {
        kind: "LogicalExpr",
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as LogicalExpression;
    }

    return left;
  }

  // Equality (==, !=)
  private parse_equality_expression(): Expression {
    let left = this.parse_relational_expression();

    while (["==", "!="].includes(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parse_relational_expression();

      left = {
        kind: "ComparisonExpr",
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as ComparisonExpression;
    }

    return left;
  }

  // Relational (<, >, <=, >=)
  private parse_relational_expression(): Expression {
    let left = this.parse_additive_expression();

    while (["<", ">", "<=", ">="].includes(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parse_additive_expression();

      left = {
        kind: "ComparisonExpr",
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as ComparisonExpression;
    }

    return left;
  }

  private parse_object_expression(): Expression {
    // { Prop[] }
    if (this.at().type !== TokenType.OpenBrace) {
      return this.parse_logical_or_expression();
    }

    this.eat(); // advance past open brace.

    const properties = new Array<Property>();

    while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
      // { key: val, key2:val }
      const key = this.expect(
        TokenType.Identifier,
        "Object literal key expected.",
      ).value;

      // Allows shorthand key: pair -> { key, }
      if (this.at().type === TokenType.Comma) {
        this.eat(); // advance past comma

        properties.push({
          key,
          kind: "Property",
          start: this.at().start,
          end: this.at().end,
        } as Property);
        continue;
      }
      // Allows shorthand key: pair -> { key }
      else if (this.at().type === TokenType.CloseBrace) {
        properties.push({
          key,
          kind: "Property",
        } as Property);
        continue;
      }

      // { key: value }
      this.expect(
        TokenType.Colon,
        "Expected ':' following object literal key.",
      );
      const value = this.parse_expression();
      properties.push({
        kind: "Property",
        value,
        key,
        start: this.at().start,
        end: this.at().end,
      });

      if (this.at().type !== TokenType.CloseBrace) {
        this.expect(
          TokenType.Comma,
          "Expected comma or Closing Bracket following property.",
        );
      }
    }

    this.expect(TokenType.CloseBrace, "Object literal missing closing brace.");

    return { kind: "ObjectLiteral", properties } as ObjectLiteral;
  }

  private parse_assignment_expression(): Expression {
    const left = this.parse_object_expression();

    if (this.at().type === TokenType.Equals) {
      this.eat(); // advance past '='
      const value = this.parse_assignment_expression();

      return {
        kind: "AssignmentExpr",
        assignee: left,
        value,
      } as AssignmentExpression;
    }

    return left;
  }

  private parse_additive_expression(): Expression {
    let left = this.parse_multiplicative_expression();

    while (this.at().value === "+" || this.at().value === "-") {
      const operator = this.eat().value;
      const right = this.parse_multiplicative_expression();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  private parse_multiplicative_expression(): Expression {
    let left = this.parse_unary_expression();

    while (
      this.at().value === "*" ||
      this.at().value === "/" ||
      this.at().value === "%"
    ) {
      const operator = this.eat().value;
      const right = this.parse_unary_expression();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  private parse_unary_expression(): Expression {
    // Check if current token is a unary operator
    if (
      this.at().value === "!" ||
      this.at().value === "-" ||
      this.at().value === "+"
    ) {
      const operator = this.eat();
      const argument = this.parse_unary_expression(); // Recursive for multiple unaries: !!x, -(-5)

      return {
        kind: "UnaryExpr",
        operator: operator.value,
        argument,
        start: operator.start,
        end: argument.end,
      } as UnaryExpression;
    }

    // Not a unary operator, continue to next precedence level
    return this.parse_call_member_expression();
  }

  private parse_call_member_expression(): Expression {
    let object = this.parse_primary_expression();

    while (true) {
      if (this.at().type === TokenType.Dot) {
        // Dot member access: obj.prop
        this.eat();
        const property = this.parse_primary_expression();

        if (property.kind !== "Identifier") {
          fatalFmt(
            this.at().start,
            "Cannot use dot operator without right hand side being an identifier",
          );
        }

        object = {
          kind: "MemberExpr",
          object,
          property,
          computed: false,
        } as MemberExpression;
      } else if (this.at().type === TokenType.OpenBracket) {
        // Bracket member access: obj[expr]
        this.eat();
        const property = this.parse_expression();

        this.expect(
          TokenType.CloseBracket,
          "Missing closing bracket for computed value.",
        );

        object = {
          kind: "MemberExpr",
          object,
          property,
          computed: true,
        } as MemberExpression;
      } else if (this.at().type === TokenType.OpenParen) {
        // Function call: func() or obj.method()
        object = {
          kind: "CallExpr",
          caller: object,
          args: this.parse_args(),
        } as CallExpression;
      } else {
        break;
      }
    }

    return object;
  }

  private parse_args(): Expression[] {
    this.expect(
      TokenType.OpenParen,
      "Expected opening parenthesis for function call arguments.",
    );

    const args =
      this.at().type === TokenType.CloseParen
        ? []
        : this.parse_arguments_list();

    this.expect(
      TokenType.CloseParen,
      "Missing closing parenthesis inside arguments list.",
    );

    return args;
  }

  private parse_arguments_list(): Expression[] {
    const args = [this.parse_assignment_expression()];

    while (this.at().type === TokenType.Comma && this.eat()) {
      args.push(this.parse_assignment_expression());
    }

    return args;
  }

  private parse_array_literal(): Expression {
    const tok = this.eat(); // skip bracket

    if (this.at().type === TokenType.CloseBracket) {
      this.eat();
      return {
        kind: "ArrayLiteral",
        items: [],
        start: tok.start,
        end: tok.end,
      } as ArrayLiteral;
    }

    const items: Expression[] = [];
    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBracket
    ) {
      items.push(this.parse_expression());

      if (this.at().type === TokenType.CloseBracket) break;
      if (this.at().type === TokenType.Comma) {
        this.eat();

        if (this.at().type === TokenType.CloseBracket) {
          break; // Exit loop, allow trailing comma
        }
      } else if (this.at().type !== TokenType.CloseBracket) {
        fatalFmt(
          this.at().start,
          "Expected ',' or ']' in array literal, got '%s'",
          this.at().value,
        );
      }
    }

    this.expect(
      TokenType.CloseBracket,
      "Close bracket expected for closing array expression.",
    );

    return {
      kind: "ArrayLiteral",
      items,
      start: tok.start,
      end: tok.end,
    } as ArrayLiteral;
  }

  private validate_type(type: string): boolean {
    return validateTypeString(type);
  }

  private parse_type_annotation(): TypeAnnotation | undefined {
    if (this.at().type === TokenType.Colon) {
      this.eat(); // eat the colon

      const parseSingleType = (): {
        type: TYPE;
        isArray: boolean;
        start: number;
        end: number;
      } => {
        const typeToken = this.expect(
          TokenType.Identifier,
          "Expected type identifier in type annotation.",
        );

        if (typeToken.value === "array") {
          const open = this.expect(
            TokenType.ComparisonOperator,
            "Expected item type for array annotation, e.g. array<string>",
          );

          if (open.value !== "<") {
            fatalFmt(
              open.start,
              "Expected '<' after 'array' in type annotation, got '%s'",
              open.value,
            );
          }

          const itemTypeToken = this.expect(
            TokenType.Identifier,
            "Expected item type identifier in array type annotation.",
          );

          if (!this.validate_type(itemTypeToken.value)) {
            fatalFmt(
              itemTypeToken.start,
              "Invalid type '%s' in array type annotation.",
              itemTypeToken.value,
            );
          }

          const close = this.expect(
            TokenType.ComparisonOperator,
            "Expected '>' after item type in array annotation.",
          );

          if (close.value !== ">") {
            fatalFmt(
              close.start,
              "Expected '>' after item type in array annotation, got '%s'",
              close.value,
            );
          }

          return {
            type: itemTypeToken.value as TYPE,
            isArray: true,
            start: typeToken.start,
            end: close.end,
          };
        }

        let isArray = false;
        let end = typeToken.end;

        if (this.at().type === TokenType.OpenBracket) {
          this.eat();
          const closeBracket = this.expect(
            TokenType.CloseBracket,
            "Expected closing bracket for array type annotation.",
          );
          isArray = true;
          end = closeBracket.end;
        }

        if (!this.validate_type(typeToken.value)) {
          fatalFmt(
            typeToken.start,
            "Invalid type '%s' in type annotation.",
            typeToken.value,
          );
        }

        return {
          type: typeToken.value as TYPE,
          isArray,
          start: typeToken.start,
          end,
        };
      };

      const first = parseSingleType();
      const types: TYPE[] = [first.type];
      const isArray = first.isArray;
      let end = first.end;

      while (this.at().type === TokenType.Pipe) {
        this.eat();
        const next = parseSingleType();

        if (next.isArray !== isArray) {
          fatalFmt(
            this.at().start,
            "Mixed array and non-array union types are not supported yet.",
          );
        }

        if (!types.includes(next.type)) {
          types.push(next.type);
        }

        end = next.end;
      }

      const isOptional = this.at().type === TokenType.QuestionMark;

      if (isOptional) {
        end = this.eat().end;
      }

      return {
        kind: "TypeAnnotation",
        types,
        isArray,
        isOptional,
        start: first.start,
        end,
      } as TypeAnnotation;
    }
    return undefined;
  }

  // Order of Precedence
  // AssignmentExpr
  // ObjectExpr
  // FunctionCall
  // LogicalExpr
  // ComparisonExpr
  // AdditiveExpr
  // MultiplicativeExpr
  // CallExpr
  // MemberExpr
  // UnaryExpr
  // PrimaryExpr

  private parse_primary_expression(): Expression {
    const tk = this.at().type;

    switch (tk) {
      case TokenType.Identifier: {
        const tok = this.eat();
        return {
          kind: "Identifier",
          symbol: tok.value,
          start: tok.start,
          end: tok.end,
        } as Identifier;
      }
      case TokenType.Number: {
        const tok = this.eat();
        return {
          kind: "NumericLiteral",
          value: parseFloat(tok.value),
          start: tok.start,
          end: tok.end,
        } as Expression;
      }
      case TokenType.String: {
        const tok = this.eat();
        return {
          kind: "StringLiteral",
          value: tok.value,
          start: tok.start,
          end: tok.end,
        } as Expression;
      }
      case TokenType.Null: {
        const tok = this.eat();
        return {
          kind: "NullLiteral",
          start: tok.start,
          end: tok.end,
        } as Expression;
      }
      case TokenType.OpenParen: {
        this.eat(); // eat the opening parenthesis
        const value = this.parse_expression();
        this.expect(
          TokenType.CloseParen,
          "Unexpected token found inside parenthesised expression. Expected closing parenthesis.",
        ); // closing parenthesis
        return value;
      }
      case TokenType.OpenBracket: {
        return this.parse_array_literal();
      }
      default: {
        const tok = this.at();
        fatalFmt(
          tok.start,
          "Unexpected token '%s' found during parsing",
          tok.value,
        );
      }
    }
  }
}
