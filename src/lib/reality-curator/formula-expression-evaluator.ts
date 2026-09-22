import type { FormulaExpressionNodeV1 } from "./formula-rule-registry.contract";
type JsonRecord = Record<string, unknown>;
export type EvalValue = string | number | boolean | null | EvalValue[] | JsonRecord;
export const MISSING = Symbol("missing");
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function own(record: JsonRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function number(value: unknown, code: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`FORMULA_RULE_TEST_${code}_NUMBER_REQUIRED`);
  }
  return value;
}

function compareOrdered(
  left: unknown,
  right: unknown,
  op: "gt" | "gte" | "lt" | "lte",
) {
  if (typeof left === "number" && typeof right === "number") {
    if (op === "gt") return left > right;
    if (op === "gte") return left >= right;
    if (op === "lt") return left < right;
    return left <= right;
  }

  if (typeof left === "string" && typeof right === "string") {
    if (op === "gt") return left > right;
    if (op === "gte") return left >= right;
    if (op === "lt") return left < right;
    return left <= right;
  }

  throw new Error("FORMULA_RULE_TEST_ORDERED_VALUES_INCOMPATIBLE");
}

export function evaluate(
  node: FormulaExpressionNodeV1,
  samples: JsonRecord,
  depth = 0,
): EvalValue | typeof MISSING {
  if (depth > 32) throw new Error("FORMULA_RULE_TEST_EXPRESSION_TOO_DEEP");

  if (node.op === "literal") return (node.value ?? null) as string | number | boolean | null;
  if (node.op === "input") {
    const key = text(node.input);
    return own(samples, key) ? (samples[key] as EvalValue) : MISSING;
  }

  const args = node.args ?? [];

  if (node.op === "if") {
    const condition = evaluate(args[0], samples, depth + 1);
    if (condition === MISSING || typeof condition !== "boolean") {
      throw new Error("FORMULA_RULE_TEST_IF_BOOLEAN_REQUIRED");
    }
    return evaluate(condition ? args[1] : args[2], samples, depth + 1);
  }

  if (node.op === "and" || node.op === "or") {
    for (const arg of args) {
      const value = evaluate(arg, samples, depth + 1);
      if (value === MISSING || typeof value !== "boolean") {
        throw new Error(`FORMULA_RULE_TEST_${node.op.toUpperCase()}_BOOLEAN_REQUIRED`);
      }
      if (node.op === "and" && !value) return false;
      if (node.op === "or" && value) return true;
    }
    return node.op === "and";
  }

  if (node.op === "coalesce") {
    for (const arg of args) {
      const value = evaluate(arg, samples, depth + 1);
      if (value !== MISSING && value !== null) return value;
    }
    return null;
  }

  const values = args.map((arg) => evaluate(arg, samples, depth + 1));
  if (values.some((value) => value === MISSING)) {
    throw new Error(`FORMULA_RULE_TEST_${node.op.toUpperCase()}_INPUT_MISSING`);
  }

  switch (node.op) {
    case "add": {
      let total = 0;
      for (const value of values) total += number(value, "ADD");
      return total;
    }
    case "subtract":
      return number(values[0], "SUBTRACT") - number(values[1], "SUBTRACT");
    case "multiply": {
      let result = 1;
      for (const value of values) result *= number(value, "MULTIPLY");
      return result;
    }
    case "divide": {
      const divisor = number(values[1], "DIVIDE");
      if (divisor === 0) throw new Error("FORMULA_RULE_TEST_DIVISION_BY_ZERO");
      return number(values[0], "DIVIDE") / divisor;
    }
    case "min":
      return Math.min(...values.map((value) => number(value, "MIN")));
    case "max":
      return Math.max(...values.map((value) => number(value, "MAX")));
    case "round": {
      const digits = node.digits ?? 0;
      if (!Number.isInteger(digits) || digits < -12 || digits > 12) {
        throw new Error("FORMULA_RULE_TEST_ROUND_DIGITS_INVALID");
      }
      const factor = 10 ** digits;
      return Math.round(number(values[0], "ROUND") * factor) / factor;
    }
    case "eq":
      return values[0] === values[1];
    case "ne":
      return values[0] !== values[1];
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return compareOrdered(values[0], values[1], node.op);
    case "not":
      if (typeof values[0] !== "boolean") throw new Error("FORMULA_RULE_TEST_NOT_BOOLEAN_REQUIRED");
      return !values[0];
    case "sum": {
      const collection = values[0];
      if (!Array.isArray(collection)) throw new Error("FORMULA_RULE_TEST_SUM_ARRAY_REQUIRED");
      let total = 0;
      for (const value of collection) total += number(value, "SUM");
      return total;
    }
    case "average": {
      const collection = values[0];
      if (!Array.isArray(collection) || collection.length === 0) {
        throw new Error("FORMULA_RULE_TEST_AVERAGE_NONEMPTY_ARRAY_REQUIRED");
      }
      let total = 0;
      for (const value of collection) total += number(value, "AVERAGE");
      return total / collection.length;
    }
    case "count": {
      const collection = values[0];
      if (!Array.isArray(collection)) throw new Error("FORMULA_RULE_TEST_COUNT_ARRAY_REQUIRED");
      return collection.length;
    }
    case "count_unique_days": {
      const collection = values[0];
      if (!Array.isArray(collection)) throw new Error("FORMULA_RULE_TEST_COUNT_UNIQUE_DAYS_ARRAY_REQUIRED");
      const days = new Set<string>();
      for (const item of collection) {
        const record = object(item);
        const candidate =
          typeof item === "string"
            ? item
            : text(record.date) ||
              text(record.timestamp) ||
              text(record.effectiveAt) ||
              text(record.occurredAt) ||
              text(record.effective_at) ||
              text(record.occurred_at);
        const parsed = Date.parse(candidate);
        if (!candidate || Number.isNaN(parsed)) {
          throw new Error("FORMULA_RULE_TEST_COUNT_UNIQUE_DAYS_TIMESTAMP_REQUIRED");
        }
        days.add(new Date(parsed).toISOString().slice(0, 10));
      }
      return days.size;
    }
    case "latest": {
      const collection = values[0];
      if (!Array.isArray(collection) || collection.length === 0) {
        throw new Error("FORMULA_RULE_TEST_LATEST_NONEMPTY_ARRAY_REQUIRED");
      }
      return collection[collection.length - 1] as EvalValue;
    }
    default:
      throw new Error(`FORMULA_RULE_TEST_OPERATION_UNSUPPORTED:${node.op}`);
  }
}

