export const FORMULA_RULE_CONTRACT = "ARCTOR_FORMULA_RULE_REGISTRY_V1" as const;
export const FORMULA_EXPRESSION_LANGUAGE = "arctor_formula_v1" as const;

export const FORMULA_RULE_SCOPES = [
  "system",
  "user",
  "organization",
] as const;

export const FORMULA_RULE_RESOLUTION_MODES = [
  "parallel",
  "replace_base",
  "protected",
] as const;

export const FORMULA_RULE_VERSION_STATUSES = [
  "draft",
  "testing",
  "published",
  "disabled",
  "superseded",
  "archived",
] as const;

export const FORMULA_RESULT_FACT_ROLES = ["result", "snapshot"] as const;

export const FORMULA_MISSING_INPUT_POLICIES = [
  "insufficient_data",
  "skip",
  "zero",
] as const;

/**
 * Closed operation vocabulary for ARCTor deterministic formulas.
 * No JavaScript, SQL, eval, Function constructor or arbitrary source code.
 */
export const FORMULA_OPERATIONS = [
  "literal",
  "input",
  "add",
  "subtract",
  "multiply",
  "divide",
  "min",
  "max",
  "coalesce",
  "round",
  "if",
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "and",
  "or",
  "not",
  "sum",
  "average",
  "count",
  "count_unique_days",
  "latest",
] as const;

export type FormulaRuleScope = (typeof FORMULA_RULE_SCOPES)[number];
export type FormulaRuleResolutionMode =
  (typeof FORMULA_RULE_RESOLUTION_MODES)[number];
export type FormulaRuleVersionStatus =
  (typeof FORMULA_RULE_VERSION_STATUSES)[number];
export type FormulaResultFactRole =
  (typeof FORMULA_RESULT_FACT_ROLES)[number];
export type FormulaMissingInputPolicy =
  (typeof FORMULA_MISSING_INPUT_POLICIES)[number];
export type FormulaOperation = (typeof FORMULA_OPERATIONS)[number];

export type FormulaExpressionNodeV1 = {
  op: FormulaOperation;
  args?: FormulaExpressionNodeV1[];
  input?: string;
  value?: number | string | boolean | null;
  digits?: number;
};

export type FormulaInputSelectorV1 = {
  key: string;
  kind: "source_fact" | "result_fact" | "snapshot" | "reference";
  parameterDefinitionId?: string;
  valueObjectId?: string;
  window?: "event" | "hour" | "day" | "week" | "month" | "rolling_7_days" | "rolling_30_days";
  selection?: "latest" | "all" | "sum" | "average" | "count" | "count_unique_days";
  required?: boolean;
};

export type FormulaRuleVersionContractV1 = {
  expressionLanguage: typeof FORMULA_EXPRESSION_LANGUAGE;
  inputs: FormulaInputSelectorV1[];
  condition: Record<string, unknown>;
  expression: FormulaExpressionNodeV1;
  triggers: Array<"fact_created" | "fact_corrected" | "standard_changed" | "time_boundary">;
  resultFactRole: FormulaResultFactRole;
  resultUnitCode?: string | null;
  missingInputPolicy: FormulaMissingInputPolicy;
};

const operationSet = new Set<string>(FORMULA_OPERATIONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Structural guard only. Semantic/unit validation belongs to the executor.
 */
export function isFormulaExpressionNodeV1(
  value: unknown,
  depth = 0,
): value is FormulaExpressionNodeV1 {
  if (depth > 32 || !isRecord(value)) return false;
  if (typeof value.op !== "string" || !operationSet.has(value.op)) return false;

  if (value.args !== undefined) {
    if (!Array.isArray(value.args) || value.args.length > 64) return false;
    if (!value.args.every((node) => isFormulaExpressionNodeV1(node, depth + 1))) {
      return false;
    }
  }

  if (value.input !== undefined && typeof value.input !== "string") return false;
  if (
    value.digits !== undefined &&
    (typeof value.digits !== "number" ||
      !Number.isInteger(value.digits) ||
      Math.abs(value.digits) > 12)
  ) {
    return false;
  }

  if (value.value !== undefined) {
    const type = typeof value.value;
    if (
      value.value !== null &&
      type !== "number" &&
      type !== "string" &&
      type !== "boolean"
    ) {
      return false;
    }
  }

  return true;
}
