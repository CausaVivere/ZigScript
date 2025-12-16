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
} from "./ast.ts";
import { tokenize, type Token, TokenType } from "./lexer";

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
      console.error("Parser Error:\n", err, prev, " - Expecting: ", type);
      process.exit(1);
    }

    return prev;
  }

  public produceAST(sourceCode: string): Program {
    this.tokens = tokenize(sourceCode);

    const program: Program = {
      kind: "Program",
      body: [],
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
      default:
        const expr = this.parse_expression();
        // Consume optional semicolon after expression statements
        if (this.at().type === TokenType.Semicolon) {
          this.eat();
        }
        return expr;
    }
  }

  // LET Identifier;
  // ( LET | CONST ) IDENT = EXPR;
  private parse_var_decleration(): Statement {
    const isConstant = this.eat().type === TokenType.Const;
    const identifier = this.expect(
      TokenType.Identifier,
      `Expected identifier name following ${
        isConstant ? "const" : "let"
      } keyword.`
    ).value;

    if (this.at().type === TokenType.Semicolon) {
      this.eat(); // eat the semicolon

      if (isConstant) {
        console.error("Constant variable declarations must be initialized.");
        process.exit(1);
      }
      return {
        kind: "VariableDeclaration",
        identifier,
        constant: false,
      } as VariableDeclaration;
    }

    this.expect(
      TokenType.Equals,
      "Expected '=' following variable identifier in declaration."
    );

    const declaration = {
      kind: "VariableDeclaration",
      constant: isConstant,
      identifier,
      value: this.parse_expression(),
    } as VariableDeclaration;

    this.expect(
      TokenType.Semicolon,
      "Expected ';' following variable declaration."
    );

    return declaration;
  }

  private parse_expression(): Expression {
    return this.parse_assignment_expression(); // switch this out with object expression later
  }

  private parse_object_expression(): Expression {
    // { Prop[] }
    if (this.at().type !== TokenType.OpenBrace) {
      return this.parse_additive_expression();
    }

    this.eat(); // advance past open brace.

    const properties = new Array<Property>();

    while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
      // { key: val, key2:val }
      const key = this.expect(
        TokenType.Identifier,
        "Object literal key expected."
      ).value;

      // Allows shorthand key: pair -> { key, }
      if (this.at().type === TokenType.Comma) {
        this.eat(); // advance past comma
        properties.push({
          key,
          kind: "Property",
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
        "Expected ':' following object literal key."
      );
      const value = this.parse_expression();
      properties.push({ kind: "Property", value, key });

      if (this.at().type !== TokenType.CloseBrace) {
        this.expect(
          TokenType.Comma,
          "Expected comma or Closing Bracket following property."
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
    let left = this.parse_call_member_expression();

    while (
      this.at().value === "*" ||
      this.at().value === "/" ||
      this.at().value === "%"
    ) {
      const operator = this.eat().value;
      const right = this.parse_primary_expression();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  // foo.x()()
  private parse_call_member_expression(): Expression {
    const member = this.parse_member_expression();

    if (this.at().type === TokenType.OpenParen) {
      return this.parse_call_expression(member);
    }

    return member;
  }

  private parse_call_expression(caller: Expression): Expression {
    let call_expr: Expression = {
      kind: "CallExpr",
      caller,
      args: this.parse_args(),
    } as CallExpression;

    if (this.at().type === TokenType.OpenParen) {
      call_expr = this.parse_call_expression(call_expr);
    }

    return call_expr;
  }

  private parse_args(): Expression[] {
    this.expect(
      TokenType.OpenParen,
      "Expected opening parenthesis for function call arguments."
    );

    const args =
      this.at().type === TokenType.CloseParen
        ? []
        : this.parse_arguments_list();

    this.expect(
      TokenType.CloseParen,
      "Missing closign parenthesis inside arguments list."
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

  private parse_member_expression(): Expression {
    let object = this.parse_primary_expression();

    while (
      this.at().type === TokenType.Dot ||
      this.at().type === TokenType.OpenBracket
    ) {
      const operator = this.eat();
      let property: Expression;
      let computed: boolean;

      // non-computed values aka obj.expr
      if (operator.type === TokenType.Dot) {
        computed = false;
        // get identifier
        property = this.parse_primary_expression();

        if (property.kind !== "Identifier") {
          console.error(
            `Can not use dot operator without right hand side being a identifier`
          );
          process.exit(1);
        }
      } else {
        // this allows obj[computedValue]
        computed = true;
        property = this.parse_expression();

        this.expect(
          TokenType.CloseBracket,
          "Missing closing bracket for computed value."
        );
      }
      object = {
        kind: "MemberExpr",
        object,
        property,
        computed,
      } as MemberExpression;
    }

    return object;
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
        return {
          kind: "Identifier",
          symbol: this.eat().value,
        } as Identifier;
      }
      case TokenType.Number: {
        return {
          kind: "NumericLiteral",
          value: parseFloat(this.eat().value),
        } as Expression;
      }
      case TokenType.String: {
        return {
          kind: "StringLiteral",
          value: this.eat().value,
        } as Expression;
      }
      case TokenType.OpenParen: {
        this.eat(); // eat the opening parenthesis
        const value = this.parse_expression();
        this.expect(
          TokenType.CloseParen,
          "Unexpected token found inside parenthesised expression. Expected closing parenthesis."
        ); // closing parenthesis
        return value;
      }
      default: {
        console.error("Unexpected token found during parsing: ", this.at());
        process.exit(1);
      }
    }
  }
}
