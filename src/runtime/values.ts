import type { Parameter, Statement } from "../frontend/ast";
import type Environment from "./environment";

export type ValueType =
  | "null"
  | "number"
  | "boolean"
  | "string"
  | "object"
  | "array"
  | "native-fn"
  | "function"
  | "conditional"
  | "break"
  | "continue"
  | "return";

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

export interface ArrayValue extends RuntimeValue {
  type: "array";
  value: RuntimeValue[];
}

export interface ObjectValue extends RuntimeValue {
  type: "object";
  properties: Map<string, RuntimeValue>;
}

export type FunctionCall = (
  args: RuntimeValue[],
  env: Environment,
) => RuntimeValue;

export interface NativeFnValue extends RuntimeValue {
  type: "native-fn";
  call: FunctionCall;
}

export interface FunctionValue extends RuntimeValue {
  type: "function";
  name: string;
  parameters: Parameter[];
  declarationEnv: Environment;
  body: Statement[];
}

export interface BreakValue extends RuntimeValue {
  type: "break";
  value: RuntimeValue | null;
}

export interface ContinueValue extends RuntimeValue {
  type: "continue";
}

export interface ReturnValue extends RuntimeValue {
  type: "return";
  value: RuntimeValue | null;
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

export function MK_BREAK(value?: RuntimeValue): BreakValue {
  return {
    type: "break",
    value: value ?? null,
  } as BreakValue;
}

export function MK_CONTINUE(): ContinueValue {
  return {
    type: "continue",
  } as ContinueValue;
}

export function MK_RETURN(value?: RuntimeValue): ReturnValue {
  return {
    type: "return",
    value: value ?? null,
  } as ReturnValue;
}
