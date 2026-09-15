import { supabase } from "../../../lib/supabase";
import {
  FORMULA_MISSING_INPUT_POLICIES,
  FORMULA_RESULT_FACT_ROLES,
  type FormulaExpressionNodeV1,
  type FormulaInputSelectorV1,
  type FormulaMissingInputPolicy,
  type FormulaResultFactRole,
  isFormulaExpressionNodeV1,
} from "./formula-rule-registry.contract";
import {
  listFormulaRuleRegistryV1,
  updateFormulaRuleDraftV1,
} from "./formula-rule-registry.server";

type JsonRecord = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INPUT_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;
const INPUT_KINDS = new Set([
  "source_fact",
  "result_fact",
  "snapshot",
  "reference",
]);
const INPUT_WINDOWS = new Set([
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
]);
const INPUT_SELECTIONS = new Set([
  "latest",
  "all",
  "sum",
  "average",
  "count",
  "count_unique_days",
]);

type FormulaTrigger =
  | "fact_created"
  | "fact_corrected"
  | "standard_changed"
  | "time_boundary";

type ParameterDefinitionRow = {
  id: string;
  canonical_unit_code: string;
  status: string;
};

export type ConfigureFormulaRuleDraftV1Input = {
  ruleVersionId: string;
  inputs: FormulaInputSelectorV1[];
  condition?: JsonRecord;
  expression: FormulaExpressionNodeV1;
  triggers: FormulaTrigger[];
  resultFactRole: FormulaResultFactRole;
  resultUnitCode?: string | null;
  missingInputPolicy: FormulaMissingInputPolicy;
  curatorMetadata?: JsonRecord;
};

type ExpressionValidationContext = {
  inputKeys: Set<string>;
  usedInputKeys: Set<string>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function assertExactArity(
  node: FormulaExpressionNodeV1,
  expected: number,
  code: string,
) {
  if ((node.args?.length ?? 0) !== expected) {
    throw new Error(code);
  }
}

function assertMinArity(
  node: FormulaExpressionNodeV1,
  minimum: number,
  code: string,
) {
  if ((node.args?.length ?? 0) < minimum) {
    throw new Error(code);
  }
}

function validateExpressionNode(
  node: FormulaExpressionNodeV1,
  context: ExpressionValidationContext,
  depth = 0,
) {
  if (depth > 32) {
    throw new Error("FORMULA_RULE_BUILDER_EXPRESSION_TOO_DEEP");
  }

  const args = node.args ?? [];

  if (node.op === "literal") {
    if (args.length > 0 || node.input !== undefined) {
      throw new Error("FORMULA_RULE_BUILDER_LITERAL_SHAPE_INVALID");
    }
    if (node.value === undefined || node.value === null) {
      throw new Error("FORMULA_RULE_BUILDER_PLACEHOLDER_LITERAL_NOT_COMPLETE");
    }
    if (node.digits !== undefined) {
      throw new Error("FORMULA_RULE_BUILDER_LITERAL_DIGITS_INVALID");
    }
    return;
  }

  if (node.op === "input") {
    if (args.length > 0 || node.value !== undefined || node.digits !== undefined) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_SHAPE_INVALID");
    }

    const inputKey = text(node.input);
    if (!inputKey || !context.inputKeys.has(inputKey)) {
      throw new Error("FORMULA_RULE_BUILDER_UNKNOWN_INPUT");
    }

    context.usedInputKeys.add(inputKey);
    return;
  }

  if (node.input !== undefined || node.value !== undefined) {
    throw new Error("FORMULA_RULE_BUILDER_OPERATOR_SHAPE_INVALID");
  }

  if (node.op !== "round" && node.digits !== undefined) {
    throw new Error("FORMULA_RULE_BUILDER_DIGITS_ONLY_ALLOWED_FOR_ROUND");
  }

  switch (node.op) {
    case "subtract":
    case "divide":
      assertExactArity(node, 2, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    case "add":
    case "multiply":
    case "min":
    case "max":
    case "coalesce":
      assertMinArity(node, 2, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    case "round":
      assertExactArity(node, 1, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    case "if":
      assertExactArity(node, 3, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    case "eq":
    case "ne":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      assertExactArity(node, 2, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    case "and":
    case "or":
      assertMinArity(node, 2, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    case "not":
    case "sum":
    case "average":
    case "count":
    case "count_unique_days":
    case "latest":
      assertExactArity(node, 1, "FORMULA_RULE_BUILDER_ARITY_INVALID");
      break;

    default:
      throw new Error("FORMULA_RULE_BUILDER_OPERATION_INVALID");
  }

  for (const child of args) {
    validateExpressionNode(child, context, depth + 1);
  }
}

function validateCondition(
  condition: JsonRecord,
  context: ExpressionValidationContext,
) {
  const keys = Object.keys(condition);
  if (keys.length === 0) return;

  if (keys.length !== 1 || keys[0] !== "expression") {
    throw new Error("FORMULA_RULE_BUILDER_CONDITION_SHAPE_INVALID");
  }

  const rawExpression = condition.expression;
  if (!isFormulaExpressionNodeV1(rawExpression)) {
    throw new Error("FORMULA_RULE_BUILDER_CONDITION_EXPRESSION_INVALID");
  }

  const booleanRootOps = new Set([
    "eq",
    "ne",
    "gt",
    "gte",
    "lt",
    "lte",
    "and",
    "or",
    "not",
  ]);

  if (!booleanRootOps.has(rawExpression.op)) {
    throw new Error("FORMULA_RULE_BUILDER_CONDITION_ROOT_NOT_BOOLEAN");
  }

  validateExpressionNode(rawExpression, context);
}

function validateInputs(inputs: FormulaInputSelectorV1[]) {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 128) {
    throw new Error("FORMULA_RULE_BUILDER_INPUTS_INVALID");
  }

  const keys = new Set<string>();

  for (const input of inputs) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_INVALID");
    }

    const key = text(input.key);
    if (!INPUT_KEY_RE.test(key) || keys.has(key)) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_KEY_INVALID_OR_DUPLICATE");
    }

    if (!INPUT_KINDS.has(text(input.kind))) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_KIND_INVALID");
    }

    if (
      input.parameterDefinitionId !== undefined &&
      !UUID_RE.test(text(input.parameterDefinitionId))
    ) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_PARAMETER_ID_INVALID");
    }

    if (
      input.valueObjectId !== undefined &&
      !UUID_RE.test(text(input.valueObjectId))
    ) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_VALUE_OBJECT_ID_INVALID");
    }

    if (
      input.window !== undefined &&
      !INPUT_WINDOWS.has(text(input.window))
    ) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_WINDOW_INVALID");
    }

    if (
      input.selection !== undefined &&
      !INPUT_SELECTIONS.has(text(input.selection))
    ) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_SELECTION_INVALID");
    }

    if (
      input.required !== undefined &&
      typeof input.required !== "boolean"
    ) {
      throw new Error("FORMULA_RULE_BUILDER_INPUT_REQUIRED_INVALID");
    }

    keys.add(key);
  }

  return keys;
}

function validateTriggers(triggers: FormulaTrigger[]) {
  const allowed = new Set<FormulaTrigger>([
    "fact_created",
    "fact_corrected",
    "standard_changed",
    "time_boundary",
  ]);

  if (
    !Array.isArray(triggers) ||
    triggers.length === 0 ||
    triggers.length > 16 ||
    triggers.some((trigger) => !allowed.has(trigger))
  ) {
    throw new Error("FORMULA_RULE_BUILDER_TRIGGERS_INVALID");
  }
}

async function readTargetParameterUnit(parameterDefinitionId: string) {
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select("id,canonical_unit_code,status")
    .eq("id", parameterDefinitionId)
    .limit(1);

  if (error) {
    throw new Error(
      `FORMULA_RULE_BUILDER_TARGET_PARAMETER_READ_FAILED:${error.message}`,
    );
  }

  const row =
    ((data as unknown as ParameterDefinitionRow[] | null) ?? [])[0] ?? null;

  if (!row || row.status !== "active") {
    throw new Error("FORMULA_RULE_BUILDER_TARGET_PARAMETER_NOT_ACTIVE");
  }

  return text(row.canonical_unit_code);
}

export async function configureFormulaRuleDraftV1(
  input: ConfigureFormulaRuleDraftV1Input,
) {
  if (!input || typeof input !== "object") {
    throw new Error("FORMULA_RULE_BUILDER_REQUEST_INVALID");
  }

  if (!UUID_RE.test(text(input.ruleVersionId))) {
    throw new Error("FORMULA_RULE_BUILDER_VERSION_ID_INVALID");
  }

  if (!isFormulaExpressionNodeV1(input.expression)) {
    throw new Error("FORMULA_RULE_BUILDER_EXPRESSION_INVALID");
  }

  const registry = await listFormulaRuleRegistryV1();

  let matchedSeries: (typeof registry)[number] | null = null;
  let matchedVersion:
    | (typeof registry)[number]["versions"][number]
    | null = null;

  for (const series of registry) {
    const version =
      series.versions.find((item) => item.id === input.ruleVersionId) ?? null;

    if (version) {
      matchedSeries = series;
      matchedVersion = version;
      break;
    }
  }

  if (!matchedSeries || !matchedVersion) {
    throw new Error("FORMULA_RULE_BUILDER_VERSION_NOT_FOUND");
  }

  if (
    matchedVersion.status_code !== "draft" &&
    matchedVersion.status_code !== "testing"
  ) {
    throw new Error("FORMULA_RULE_BUILDER_VERSION_NOT_EDITABLE");
  }

  const inputKeys = validateInputs(input.inputs);
  validateTriggers(input.triggers);

  if (!FORMULA_RESULT_FACT_ROLES.includes(input.resultFactRole)) {
    throw new Error("FORMULA_RULE_BUILDER_RESULT_ROLE_INVALID");
  }

  if (!FORMULA_MISSING_INPUT_POLICIES.includes(input.missingInputPolicy)) {
    throw new Error("FORMULA_RULE_BUILDER_MISSING_INPUT_POLICY_INVALID");
  }

  const validationContext: ExpressionValidationContext = {
    inputKeys,
    usedInputKeys: new Set<string>(),
  };

  validateExpressionNode(input.expression, validationContext);

  const condition = input.condition ?? {};
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    throw new Error("FORMULA_RULE_BUILDER_CONDITION_INVALID");
  }

  validateCondition(condition, validationContext);

  for (const selector of input.inputs) {
    if (selector.required === true && !validationContext.usedInputKeys.has(selector.key)) {
      throw new Error(
        `FORMULA_RULE_BUILDER_REQUIRED_INPUT_UNUSED:${selector.key}`,
      );
    }
  }

  const seriesMetadata = asRecord(matchedSeries.metadata_json);
  if (text(seriesMetadata.authoringSurface) === "consequence_constructor") {
    const sourceSelector = input.inputs.find(
      (selector) =>
        selector.kind === "source_fact" &&
        selector.required === true &&
        selector.valueObjectId === matchedSeries.source_value_object_id &&
        selector.parameterDefinitionId ===
          matchedSeries.source_parameter_definition_id,
    );

    if (!sourceSelector) {
      throw new Error(
        "FORMULA_RULE_BUILDER_CONSEQUENCE_SOURCE_INPUT_REQUIRED",
      );
    }
  }

  const targetUnit = await readTargetParameterUnit(
    matchedSeries.target_parameter_definition_id,
  );
  const requestedResultUnit = text(input.resultUnitCode);

  if (requestedResultUnit && requestedResultUnit !== targetUnit) {
    throw new Error(
      "FORMULA_RULE_BUILDER_RESULT_UNIT_TARGET_PARAMETER_MISMATCH",
    );
  }

  const currentMetadata = asRecord(matchedVersion.metadata_json);
  const configuredAt = new Date().toISOString();

  const version = await updateFormulaRuleDraftV1({
    ruleVersionId: matchedVersion.id,
    inputs: input.inputs,
    condition,
    expression: input.expression,
    triggers: [...new Set(input.triggers)],
    resultFactRole: input.resultFactRole,
    resultUnitCode: targetUnit || null,
    missingInputPolicy: input.missingInputPolicy,
    versionMetadata: {
      ...currentMetadata,
      ...(input.curatorMetadata ?? {}),
      formulaState: "configured",
      draftState: "configured",
      draftIncomplete: false,
      placeholderExpression: false,
      resultFactRoleProvisional: false,
      configuredAt,
      builderContract: "ARCTOR_FORMULA_BUILDER_V1",
    },
  });

  return {
    seriesId: matchedSeries.id,
    ruleCode: matchedSeries.rule_code,
    version,
    targetUnitCode: targetUnit || null,
    draftIncomplete: false,
    formulaState: "configured",
    publishEnabled: false,
    formulaExecutionEnabled: false,
    factWriteEnabled: false,
  };
}
