import type { Expression } from "../../frontend/ast";
import { MK_NULL, type ArrayValue, type RuntimeValue } from "../values";

export const arrayMethods = [
  "push",
  "pop",
  "shift",
  "unshift",
  "concat",
  "join",
  "slice",
  "splice",
  "map",
  "filter",
  "reduce",
  "forEach",
  "some",
  "every",
  "find",
  "includes",
  "indexOf",
  "lastIndexOf",
  "flat",
  "flatMap",
];

export const functions = {
  push,
};

export function push(array: ArrayValue, ...items: RuntimeValue[]) {
  array.value.push(...items);
  return array;
}

export function pop(array: ArrayValue): RuntimeValue {
  return array.value.pop() ?? MK_NULL();
}
