# ZigScript - Custom Programming Language

## Overview

ZigScript is a custom programming language with TypeScript-like syntax, designed to eventually compile to Zig. Currently implemented as a tree-walk interpreter in TypeScript running on Bun.

## Project Goals

- **Syntax**: TypeScript-like syntax for familiarity
- **Target**: Will eventually compile to Zig (not yet implemented)
- **Current State**: Functional tree-walk interpreter that can execute ZigScript programs

## Architecture

### 1. Frontend (Parsing)

#### Lexer (`src/frontend/lexer.ts`)

Converts source code into tokens.

**Token Types:**

- **Literals**: Number, String, Identifier
- **Keywords**: `let`, `const`, `function`
- **Operators**: `+`, `-`, `*`, `/`, `%`, `=`
- **Delimiters**: `(`, `)`, `{`, `}`, `[`, `]`, `,`, `;`, `:`, `.`

**Features:**

- Character-by-character tokenization using switch statements
- Keyword recognition (let, const, function)
- String literal support (both single and double quotes)
- Number parsing
- Identifier recognition (alphanumeric + underscore)

#### Parser (`src/frontend/parser.ts`)

Converts tokens into an Abstract Syntax Tree (AST).

**Parsing Strategy - Operator Precedence (lowest to highest):**

1. Assignment expressions (`=`)
2. Object expressions (`{ key: value }`)
3. Additive expressions (`+`, `-`)
4. Multiplicative expressions (`*`, `/`, `%`)
5. Call/Member expressions (`foo()`, `obj.prop`, `obj[key]`)
6. Primary expressions (literals, identifiers, parentheses)

**Supported Constructs:**

- Variable declarations (`let`, `const`)
- Function declarations (`function name(params) { body }`)
- Binary expressions (arithmetic)
- Assignment expressions
- Object literals with shorthand syntax
- Function calls (including chained calls: `foo()()`)
- Member access (dot notation: `obj.prop`, computed: `obj[key]`)
- Parenthesized expressions

#### AST (`src/frontend/ast.ts`)

Defines the structure of the syntax tree.

**Node Types:**

- **Statements**: Program, VariableDeclaration, FunctionDeclaration
- **Expressions**: BinaryExpr, AssignmentExpr, CallExpr, MemberExpr
- **Literals**: NumericLiteral, StringLiteral, Identifier, ObjectLiteral, Property

### 2. Runtime (Execution)

#### Values (`src/runtime/values.ts`)

Defines runtime value types.

**Value Types:**

- `null` - Null value
- `number` - Numeric values (uses JavaScript numbers)
- `boolean` - Boolean values
- `string` - String values
- `object` - Object with properties (Map-based)
- `native-fn` - Native functions implemented in TypeScript
- `function` - User-defined functions

**Helper Functions:**

- `MK_NULL()`, `MK_NUMBER(n)`, `MK_BOOL(b)`, `MK_STRING(s)` - Value constructors
- `MK_NATIVE_FN(call)` - Create native function values

#### Environment (`src/runtime/environment.ts`)

Manages variable scopes and bindings.

**Features:**

- Lexical scoping with parent environment chain
- Variable declaration with const/let distinction
- Constant enforcement (cannot reassign const variables)
- Variable lookup with scope resolution
- Global environment with built-in functions

**Built-in Globals:**

- `true`, `false`, `null` - Boolean and null constants
- `print(...args)` - Console output function
- `time()` - Returns current timestamp

#### Interpreter (`src/runtime/interpreter.ts`)

Main evaluation engine that walks the AST.

**Evaluation Flow:**

1. Dispatch based on AST node kind
2. Literals evaluate to their runtime values
3. Expressions call specialized evaluators
4. Statements may modify environment or control flow

#### Expression Evaluators (`src/runtime/eval/expressions.ts`)

**Implemented:**

- **Binary expressions**: Arithmetic operations (+, -, \*, /, %)
- **Assignment expressions**: Variable assignment with validation
- **Identifier resolution**: Variable lookup in environment
- **Object expressions**: Object literal creation with duplicate key detection
- **Call expressions**: Function invocation with arity checking

**Arity Checking:**

- Validates function call arguments match parameter count
- Throws clear error if mismatch detected

#### Statement Evaluators (`src/runtime/eval/statements.ts`)

**Implemented:**

- **Program evaluation**: Executes statement list, returns last value
- **Variable declarations**: Creates bindings in current environment
- **Function declarations**: Creates function values with closure

### 3. Utilities (`src/utils.ts`)

**Error Handling:**

- `fatal(message)` - Print error and exit (no stack trace)
- `fatalFmt(fmt, ...args)` - Formatted error with exit

**Why custom error handling?**

- Avoids exposing interpreter implementation stack traces to language users
- Provides clean, user-friendly error messages
- Single exit point for fatal errors

## Language Features

### Variables

```javascript
let x = 10; // Mutable variable
const y = 20; // Immutable constant
x = 15; // OK
y = 25; // ERROR: Cannot assign to constant
```

### Functions

```javascript
function add(x, y) {
  x + y; // Last expression is implicit return
}

const result = add(5, 10); // result = 15
```

**Features:**

- Lexical closures (functions capture their declaration environment)
- Implicit returns (last expression in function body)
- First-class functions (can be stored in variables, passed as arguments)
- Chained calls: `makeAdder(5)(10)`

### Objects

```javascript
const obj = {
  x: 100,
  y: 200,
  z, // Shorthand for z: z
};

obj.x; // Dot notation access
obj["y"]; // Computed property access
```

### Operators

- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Assignment**: `=`
- **Member access**: `.`, `[]`

### Built-in Functions

- `print(args...)` - Outputs values to console
- `time()` - Returns current Unix timestamp

## Example Program

```javascript
const foo = "bar";

const obj = {
  x: 100,
  y: 32,
  foo,
  complex: {
    nested: "value",
  },
};

print(foo, (45 / 2) * 3);

function makeAdder(offset) {
  function add(x, y) {
    x + y + offset;
  }
  add;
}

const adder = makeAdder(1);
print(adder(10, 5)); // Prints 16
```

## Implementation Status

### ✅ Implemented

- Lexer with all basic tokens
- Parser with operator precedence
- Variable declarations (let/const)
- Function declarations with closures
- Arithmetic expressions
- Object literals with shorthand syntax
- Member access (dot and bracket notation)
- Function calls with arity checking
- Built-in functions (print, time)
- Error handling without stack traces

### 🚧 Not Yet Implemented

- **Control flow**: if/else, while, for loops
- **Comparison operators**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical operators**: `&&`, `||`, `!`
- **Type system**: Currently dynamically typed
- **Zig compilation**: Still an interpreter only
- **String operations**: Concatenation, methods
- **Arrays**: No array support yet
- **Return statements**: Only implicit returns
- **Comments**: No comment support in lexer
- **Error recovery**: Parser stops on first error
- **Modules/imports**: No module system

## Technical Details

### Operator Precedence Implementation

Uses recursive descent parsing with separate methods for each precedence level:

1. `parse_assignment_expression()` → lowest precedence
2. `parse_object_expression()`
3. `parse_additive_expression()` (+ -)
4. `parse_multiplicative_expression()` (\* / %)
5. `parse_call_member_expression()` (function calls, member access)
6. `parse_primary_expression()` → highest precedence

### Scoping & Closures

- Each function captures its declaration environment
- New scope created for each function call
- Parameters bound in function scope
- Parent chain enables lexical scoping

### Memory Model

- Objects use JavaScript Map for properties
- Environment chains use Map for variable storage
- Sets track constant variables

## Running ZigScript

### Requirements

- Bun runtime

### Commands

```bash
# Run a ZigScript file
bun run src/main.ts

# Start development
bun start

# Build (future: will compile to Zig)
bun run build
```

### REPL

```bash
# In main.ts, uncomment repl() and comment out run()
bun run src/main.ts
```

## Future Roadmap

### Phase 1 (Current)

- ✅ Tree-walk interpreter
- ✅ Basic language features
- ✅ Functions and closures

### Phase 2 (Next)

- Control flow (if/else, loops)
- Comparison and logical operators
- Return statements
- Arrays and string operations
- Comments

### Phase 3 (Future)

- Type annotations (TypeScript-like)
- Type checking
- Static analysis

### Phase 4 (Vision)

- Zig code generation
- Compilation pipeline
- Optimization passes
- Standalone executable output

## Error Handling Philosophy

All user-facing errors use the `fatal()` or `fatalFmt()` utilities to:

1. Print clear, concise error messages
2. Exit cleanly without stack traces
3. Avoid confusing users with interpreter internals

## Distribution Plans

- Can use `bun build --compile` to create standalone executables
- No runtime dependencies needed for compiled version
- Cross-platform support (Windows .exe, Linux, macOS)
