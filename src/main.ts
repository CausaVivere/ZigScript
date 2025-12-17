import Parser from "./frontend/parser";
import Environment, { createGlobalEnvironment } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";
import {
  MK_BOOL,
  MK_NULL,
  MK_NUMBER,
  type NumberValue,
} from "./runtime/values";

// repl();
run("./test.txt");

async function run(fileName: string) {
  const sourceCode = await Bun.file(fileName).text();

  const parser = new Parser();
  const program = parser.produceAST(sourceCode);

  const env = createGlobalEnvironment();

  const result = evaluate(program, env);
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
