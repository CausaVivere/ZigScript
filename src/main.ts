import Parser from "./frontend/parser";
import { TypeEnvironment } from "./frontend/typechecker/environment";
import Environment, { createGlobalEnvironment } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";
import typecheck from "./frontend/typechecker/checker";
import {
  MK_BOOL,
  MK_NULL,
  MK_NUMBER,
  type NumberValue,
} from "./runtime/values";

declare global {
  var sourceCode: string;
}

// repl();
run("./test.txt");

async function run(fileName: string) {
  const sourceCode = await Bun.file(fileName).text();
  globalThis.sourceCode = sourceCode;
  const parser = new Parser();
  const program = parser.produceAST(sourceCode);
  const typeEnv = new TypeEnvironment();
  // const typecheckResult = typecheck(program, typeEnv);
  // console.log("Typecheck result:", typecheckResult);

  const env = createGlobalEnvironment();

  await writeAstOutput(program);
  const result = evaluate(program, env);
}

async function writeAstOutput(program: unknown) {
  await Bun.write("ast_output.txt", JSON.stringify(program, null, 2));
}

function repl() {
  const parser = new Parser();
  const env = createGlobalEnvironment();

  console.log("\nRepl v0.1");
  while (true) {
    const input = prompt(">> ");

    if (!input || input.includes("exit")) {
      process.exit(1);
    }

    const program = parser.produceAST(input);
    console.log(JSON.stringify(program, null, 2));

    const result = evaluate(program, env);
    console.log(result);

    console.log("---------------");
  }
}
