import type { Statement } from "../frontend/ast";
import type Environment from "./environment";

export type ValueType =
  | "null"
  | "number"
  | "boolean"
  | "string"
  | "object"
  | "native-fn"
  | "function";

export interface RuntimeValue {
  type: ValueType;
}

export interface NullValue extends RuntimeValue {
  type: "null";
  value: null;
}

export interface NumberValue extends RuntimeValue {
  type: "number";
  value: number;
}

export interface BooleanValue extends RuntimeValue {
  type: "boolean";
  value: boolean;
}

export interface StringValue extends RuntimeValue {
  type: "string";
  value: string;
}

export interface ObjectValue extends RuntimeValue {
  type: "object";
  properties: Map<string, RuntimeValue>;
}

export type FunctionCall = (
  args: RuntimeValue[],
  env: Environment
) => RuntimeValue;

export interface NativeFnValue extends RuntimeValue {
  type: "native-fn";
  call: FunctionCall;
}

export interface FunctionValue extends RuntimeValue {
  type: "function";
  name: string;
  parameters: string[];
  declarationEnv: Environment;
  body: Statement[];
}

export function MK_NATIVE_FN(call: FunctionCall) {
  return { type: "native-fn", call } as NativeFnValue;
}

export function MK_NUMBER(n: number = 0): NumberValue {
  return {
    type: "number",
    value: n,
  } as NumberValue;
}

export function MK_NULL(): NullValue {
  return {
    type: "null",
    value: null,
  } as NullValue;
}

export function MK_BOOL(b: boolean = false): BooleanValue {
  return {
    type: "boolean",
    value: b,
  } as BooleanValue;
}

export function MK_STRING(s: string = ""): StringValue {
  return {
    type: "string",
    value: s,
  } as StringValue;
}
