import { evaluate, number, MISSING, type EvalValue } from "./formula-expression-evaluator";
import { supabase } from "../../../lib/supabase";
import {
  type FormulaExpressionNodeV1,
  type FormulaInputSelectorV1,
  type FormulaScientificConstantV1,
  isFormulaExpressionNodeV1,
} from "./formula-rule-registry.contract";
import { listFormulaRuleRegistryV1 } from "./formula-rule-registry.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type ShapeState = "known" | "unknown" | "incompatible";

type DefinitionRow = {
  id: string;
  dimension_code: string;
  value_type_code: string;
  canonical_unit_code: string;
  status: string;
};

type Shape = {
  state: ShapeState;
  valueType: string;
  dimension: string | null;
  unit: string | null;
  scalar: boolean;
  issues: string[];
};



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

function scientificConstantMap(
  metadata: JsonRecord,
) {
  const raw =
    Array.isArray(metadata.scientificConstants)
      ? metadata.scientificConstants
      : [];

  const result =
    new Map<string, FormulaScientificConstantV1>();

  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      continue;
    }

    const constant =
      item as FormulaScientificConstantV1;

    const key = text(constant.key);

    if (
      key &&
      typeof constant.value === "number" &&
      Number.isFinite(constant.value)
    ) {
      result.set(key, constant);
    }
  }

  return result;
}

function known(
  valueType: string,
  dimension: string | null,
  unit: string | null,
  scalar = false,
  issues: string[] = [],
): Shape {
  return { state: "known", valueType, dimension, unit, scalar, issues };
}

function unknown(issue: string): Shape {
  return {
    state: "unknown",
    valueType: "unknown",
    dimension: null,
    unit: null,
    scalar: false,
    issues: [issue],
  };
}

function bad(issue: string): Shape {
  return {
    state: "incompatible",
    valueType: "unknown",
    dimension: null,
    unit: null,
    scalar: false,
    issues: [issue],
  };
}

function issues(shapes: Shape[]) {
  return [...new Set(shapes.flatMap((shape) => shape.issues))];
}

function same(left: Shape, right: Shape) {
  return (
    left.state === "known" &&
    right.state === "known" &&
    left.valueType === right.valueType &&
    left.dimension === right.dimension &&
    left.unit === right.unit
  );
}

function sameDimension(shapes: Shape[], op: string): Shape {
  if (shapes.some((shape) => shape.state === "incompatible")) {
    return bad(`${op}:child_incompatible`);
  }
  if (shapes.some((shape) => shape.state === "unknown")) {
    return unknown(`${op}:child_unknown`);
  }

  const dimensionful = shapes.filter((shape) => !shape.scalar);
  if (dimensionful.length === 0) {
    return known("numeric", null, null, true, issues(shapes));
  }

  const base = dimensionful[0];
  for (const shape of dimensionful.slice(1)) {
    if (!same(base, shape)) return bad(`${op}:dimension_or_unit_mismatch`);
  }

  if (
    shapes.some(
      (shape) => shape.scalar && base.valueType !== "numeric",
    )
  ) {
    return bad(`${op}:numeric_literal_type_mismatch`);
  }

  return { ...base, issues: issues(shapes) };
}

function numeric(shape: Shape, op: string) {
  if (shape.state !== "known") return shape;
  return shape.valueType === "numeric" ? shape : bad(`${op}:numeric_required`);
}

function bool(shape: Shape, op: string) {
  if (shape.state !== "known") return shape;
  return shape.valueType === "boolean" ? shape : bad(`${op}:boolean_required`);
}

function literalShape(
  node: FormulaExpressionNodeV1,
  constants: Map<string, FormulaScientificConstantV1>,
): Shape {
  const constantKey =
    text(node.constantKey);

  if (constantKey) {
    const constant =
      constants.get(constantKey);

    if (!constant) {
      return bad(
        "literal:scientific_constant_missing",
      );
    }

    if (
      typeof node.value !== "number" ||
      !Number.isFinite(node.value) ||
      node.value !== constant.value
    ) {
      return bad(
        "literal:scientific_constant_value_mismatch",
      );
    }

    const dimension =
      text(constant.dimensionCode);

    const unit =
      text(constant.unitCode);

    if (
      dimension === "dimensionless" ||
      dimension === "ratio" ||
      unit === "one"
    ) {
      return known(
        "numeric",
        null,
        null,
        true,
        [`literal:constant:${constantKey}`],
      );
    }

    return known(
      "numeric",
      dimension || null,
      unit || null,
      false,
      [`literal:constant:${constantKey}`],
    );
  }

  if (typeof node.value === "number") {
    return Number.isFinite(node.value)
      ? known("numeric", null, null, true)
      : bad("literal:non_finite");
  }

  if (typeof node.value === "boolean") {
    return known("boolean", "boolean", null);
  }

  if (typeof node.value === "string") {
    return known("text", "text", null);
  }

  return bad(
    "literal:null_not_complete",
  );
}

function infer(
  node: FormulaExpressionNodeV1,
  inputShapes: Map<string, Shape>,
  constants: Map<string, FormulaScientificConstantV1>,
  depth = 0,
): Shape {
  if (depth > 32) return bad("expression:too_deep");

  if (node.op === "literal") {
    return literalShape(
      node,
      constants,
    );
  }
  if (node.op === "input") {
    return inputShapes.get(text(node.input)) ?? unknown(`input:${text(node.input)}:unknown`);
  }

  const args =
    (node.args ?? []).map((arg) =>
      infer(
        arg,
        inputShapes,
        constants,
        depth + 1,
      ),
    );
  if (args.some((shape) => shape.state === "incompatible")) {
    return bad(`${node.op}:child_incompatible`);
  }

  switch (node.op) {
    case "add":
    case "subtract":
    case "min":
    case "max":
      return sameDimension(args.map((shape) => numeric(shape, node.op)), node.op);

    case "coalesce":
      return sameDimension(args, node.op);

    case "multiply": {
      const n = args.map((shape) => numeric(shape, node.op));
      if (n.some((shape) => shape.state === "incompatible")) return bad("multiply:numeric_required");
      if (n.some((shape) => shape.state === "unknown")) return unknown("multiply:child_unknown");
      const dimensionful = n.filter((shape) => !shape.scalar);
      if (dimensionful.length === 0) {
        return known(
          "numeric",
          null,
          null,
          true,
          issues(n),
        );
      }

      if (dimensionful.length === 1) {
        return {
          ...dimensionful[0],
          issues: issues(n),
        };
      }

      if (dimensionful.length === 2) {
        const mass =
          dimensionful.find(
            (shape) =>
              shape.dimension === "mass" &&
              shape.unit === "kilogram",
          ) ?? null;

        const acceleration =
          dimensionful.find(
            (shape) =>
              shape.dimension ===
                "acceleration" &&
              shape.unit ===
                "meter_per_second_squared",
          ) ?? null;

        if (mass && acceleration) {
          return known(
            "numeric",
            "force",
            "newton",
            false,
            [
              ...issues(n),
              "multiply:mass_acceleration_to_force",
            ],
          );
        }
      }

      return unknown(
        "multiply:compound_dimension_not_modeled",
      );
    }

    case "divide": {
      const left = numeric(args[0], "divide");
      const right = numeric(args[1], "divide");
      if (left.state === "incompatible" || right.state === "incompatible") return bad("divide:numeric_required");
      if (left.state === "unknown" || right.state === "unknown") return unknown("divide:child_unknown");
      if (left.scalar && right.scalar) return known("numeric", null, null, true);
      if (!left.scalar && right.scalar) return left;
      if (!left.scalar && !right.scalar && same(left, right)) {
        return known("numeric", null, null, true, ["divide:same_unit_ratio"]);
      }
      return unknown("divide:compound_or_reciprocal_not_modeled");
    }

    case "round":
    case "sum":
    case "average":
    case "latest":
      return args[0] ?? unknown(`${node.op}:argument_missing`);

    case "count":
    case "count_unique_days":
      return known("numeric", "count", null, false, [`${node.op}:unit_unresolved`]);

    case "eq":
    case "ne":
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const comparable = sameDimension(args, node.op);
      if (comparable.state === "incompatible") return comparable;
      if (comparable.state === "unknown") return unknown(`${node.op}:dimension_unresolved`);
      return known("boolean", "boolean", null, false, comparable.issues);
    }

    case "and":
    case "or": {
      const checked = args.map((shape) => bool(shape, node.op));
      if (checked.some((shape) => shape.state === "incompatible")) return bad(`${node.op}:boolean_required`);
      if (checked.some((shape) => shape.state === "unknown")) return unknown(`${node.op}:unknown`);
      return known("boolean", "boolean", null);
    }

    case "not": {
      const checked = bool(args[0], "not");
      return checked.state === "known"
        ? known("boolean", "boolean", null)
        : checked;
    }

    case "if": {
      const condition = bool(args[0], "if");
      if (condition.state !== "known") return condition;
      return sameDimension([args[1], args[2]], "if");
    }

    default:
      return bad(`operation:${node.op}:unsupported`);
  }
}

function selectorShape(
  selector: FormulaInputSelectorV1,
  definitions: Map<string, DefinitionRow>,
): Shape {
  const id = text(selector.parameterDefinitionId);
  if (!id) return unknown(`input:${selector.key}:parameter_missing`);

  const definition = definitions.get(id);
  if (!definition || definition.status !== "active") {
    return unknown(`input:${selector.key}:parameter_inactive`);
  }

  if (
    selector.selection === "count" ||
    selector.selection === "count_unique_days"
  ) {
    return known("numeric", "count", null, false, [
      `input:${selector.key}:count_unit_unresolved`,
    ]);
  }

  return known(
    definition.value_type_code,
    definition.dimension_code,
    text(definition.canonical_unit_code) || null,
  );
}

function targetShape(definition: DefinitionRow): Shape {
  return known(
    definition.value_type_code,
    definition.dimension_code,
    text(definition.canonical_unit_code) || null,
  );
}

function algebra(result: Shape, target: Shape) {
  const allIssues = [...new Set([...result.issues, ...target.issues])];

  if (result.state === "incompatible") {
    return { status: "incompatible" as const, result, target, issues: allIssues };
  }
  if (result.state === "unknown" || target.state !== "known") {
    return {
      status: "unresolved" as const,
      result,
      target,
      issues: [...allIssues, "shape_unresolved"],
    };
  }

  if (result.scalar) {
    if (target.valueType !== "numeric") {
      return {
        status: "incompatible" as const,
        result,
        target,
        issues: [...allIssues, "bare_numeric_target_not_numeric"],
      };
    }
    return {
      status: "resolved" as const,
      result: {
        ...target,
        issues: [...result.issues, "bare_literal_assumed_target_unit"],
      },
      target,
      issues: [...allIssues, "bare_literal_assumed_target_unit"],
    };
  }

  if (
    result.valueType !== target.valueType ||
    result.dimension !== target.dimension
  ) {
    return {
      status: "incompatible" as const,
      result,
      target,
      issues: [...allIssues, "target_dimension_mismatch"],
    };
  }

  if (result.unit && target.unit && result.unit !== target.unit) {
    return {
      status: "incompatible" as const,
      result,
      target,
      issues: [...allIssues, "target_unit_mismatch"],
    };
  }

  if (!result.unit && target.unit) {
    return {
      status: "unresolved" as const,
      result,
      target,
      issues: [...allIssues, "result_unit_unresolved"],
    };
  }

  return { status: "resolved" as const, result, target, issues: allIssues };
}

function assertOutput(value: EvalValue, target: DefinitionRow) {
  if (target.value_type_code === "numeric") {
    number(value, "RESULT");
    return;
  }
  if (target.value_type_code === "boolean") {
    if (typeof value !== "boolean") throw new Error("FORMULA_RULE_TEST_RESULT_BOOLEAN_REQUIRED");
    return;
  }
  if (target.value_type_code === "text") {
    if (typeof value !== "string") throw new Error("FORMULA_RULE_TEST_RESULT_TEXT_REQUIRED");
    return;
  }
  if (target.value_type_code === "timestamp") {
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
      throw new Error("FORMULA_RULE_TEST_RESULT_TIMESTAMP_REQUIRED");
    }
    return;
  }
  throw new Error("FORMULA_RULE_TEST_TARGET_VALUE_TYPE_UNSUPPORTED");
}

async function definitions(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => UUID_RE.test(id)))];
  const map = new Map<string, DefinitionRow>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select("id,dimension_code,value_type_code,canonical_unit_code,status")
    .in("id", unique)
    .limit(1000);

  if (error) {
    throw new Error(`FORMULA_RULE_TEST_PARAMETER_READ_FAILED:${error.message}`);
  }

  for (const row of (data ?? []) as DefinitionRow[]) map.set(row.id, row);
  return map;
}

export async function testFormulaRuleDraftV1(input: {
  ruleVersionId: string;
  sampleInputs?: JsonRecord;
}) {
  const versionId = text(input?.ruleVersionId);
  if (!UUID_RE.test(versionId)) throw new Error("FORMULA_RULE_TEST_VERSION_ID_INVALID");

  const samples = object(input?.sampleInputs);
  const registry = await listFormulaRuleRegistryV1();

  let series: (typeof registry)[number] | null = null;
  let version: (typeof registry)[number]["versions"][number] | null = null;

  for (const candidate of registry) {
    const found = candidate.versions.find((item) => item.id === versionId) ?? null;
    if (found) {
      series = candidate;
      version = found;
      break;
    }
  }

  if (!series || !version) throw new Error("FORMULA_RULE_TEST_VERSION_NOT_FOUND");
  if (version.status_code !== "draft" && version.status_code !== "testing") {
    throw new Error("FORMULA_RULE_TEST_VERSION_NOT_TESTABLE");
  }

  const metadata =
    object(version.metadata_json);

  const scientificConstants =
    scientificConstantMap(metadata);

  if (metadata.draftIncomplete !== false || text(metadata.formulaState) !== "configured") {
    throw new Error("FORMULA_RULE_TEST_DRAFT_NOT_CONFIGURED");
  }

  if (!Array.isArray(version.input_contract_json)) {
    throw new Error("FORMULA_RULE_TEST_INPUT_CONTRACT_INVALID");
  }
  const selectors = version.input_contract_json as FormulaInputSelectorV1[];

  if (!isFormulaExpressionNodeV1(version.expression_contract_json)) {
    throw new Error("FORMULA_RULE_TEST_EXPRESSION_INVALID");
  }
  const expression = version.expression_contract_json;
  const condition = object(version.condition_contract_json);

  const declared = new Set(selectors.map((selector) => text(selector.key)));
  for (const key of Object.keys(samples)) {
    if (!declared.has(key)) throw new Error(`FORMULA_RULE_TEST_SAMPLE_INPUT_UNKNOWN:${key}`);
  }

  const missingRequiredSelectors = selectors.filter(
    (selector) =>
      selector.required === true && !own(samples, text(selector.key)),
  );
  const missingRequired = missingRequiredSelectors.map((selector) =>
    text(selector.key),
  );

  if (
    missingRequired.length > 0 &&
    version.missing_input_policy_code !== "zero"
  ) {
    return {
      seriesId: series.id,
      ruleCode: series.rule_code,
      versionId: version.id,
      noWrite: true,
      evaluationStatus:
        version.missing_input_policy_code === "skip"
          ? "skipped_missing_input"
          : "insufficient_data",
      missingRequiredInputs: missingRequired,
      testPassed: false,
      publishEligibleFromThisTest: false,
      formulaExecutionEnabled: false,
      factWriteEnabled: false,
    };
  }

  const ids = selectors
    .map((selector) => text(selector.parameterDefinitionId))
    .filter(Boolean);
  ids.push(series.target_parameter_definition_id);

  const defs = await definitions(ids);
  const target = defs.get(series.target_parameter_definition_id);
  if (!target || target.status !== "active") {
    throw new Error("FORMULA_RULE_TEST_TARGET_PARAMETER_NOT_ACTIVE");
  }

  const effectiveSamples: JsonRecord = { ...samples };

  if (
    missingRequiredSelectors.length > 0 &&
    version.missing_input_policy_code === "zero"
  ) {
    for (const selector of missingRequiredSelectors) {
      const key = text(selector.key);
      const parameterDefinitionId = text(selector.parameterDefinitionId);
      const definition = parameterDefinitionId
        ? defs.get(parameterDefinitionId)
        : null;

      if (
        !definition ||
        definition.status !== "active" ||
        definition.value_type_code !== "numeric"
      ) {
        throw new Error(
          `FORMULA_RULE_TEST_ZERO_POLICY_REQUIRES_NUMERIC_INPUT:${key}`,
        );
      }

      effectiveSamples[key] = 0;
    }
  }

  const inputShapes = new Map<string, Shape>();
  for (const selector of selectors) {
    inputShapes.set(text(selector.key), selectorShape(selector, defs));
  }

  const unitAlgebra = algebra(
    infer(
      expression,
      inputShapes,
      scientificConstants,
    ),
    targetShape(target),
  );
  if (unitAlgebra.status === "incompatible") {
    throw new Error(`FORMULA_RULE_TEST_UNIT_ALGEBRA_INCOMPATIBLE:${unitAlgebra.issues.join("|")}`);
  }

  if (Object.keys(condition).length > 0) {
    if (!isFormulaExpressionNodeV1(condition.expression)) {
      throw new Error("FORMULA_RULE_TEST_CONDITION_INVALID");
    }
    const conditionShape = infer(
      condition.expression,
      inputShapes,
      scientificConstants,
    );
    if (
      conditionShape.state === "incompatible" ||
      (conditionShape.state === "known" && conditionShape.valueType !== "boolean")
    ) {
      throw new Error("FORMULA_RULE_TEST_CONDITION_UNIT_ALGEBRA_INVALID");
    }

    const conditionValue = evaluate(condition.expression, effectiveSamples);
    if (conditionValue === MISSING || typeof conditionValue !== "boolean") {
      throw new Error("FORMULA_RULE_TEST_CONDITION_BOOLEAN_REQUIRED");
    }

    if (!conditionValue) {
      return {
        seriesId: series.id,
        ruleCode: series.rule_code,
        versionId: version.id,
        noWrite: true,
        evaluationStatus: "condition_false",
        output: null,
        unitAlgebra,
        testPassed: false,
        publishEligibleFromThisTest: false,
        formulaExecutionEnabled: false,
        factWriteEnabled: false,
      };
    }
  }

  const output = evaluate(expression, effectiveSamples);
  if (output === MISSING || Array.isArray(output)) {
    throw new Error("FORMULA_RULE_TEST_RESULT_SCALAR_REQUIRED");
  }
  if (output && typeof output === "object") {
    throw new Error("FORMULA_RULE_TEST_RESULT_PRIMITIVE_REQUIRED");
  }

  assertOutput(output, target);

  return {
    seriesId: series.id,
    ruleCode: series.rule_code,
    versionId: version.id,
    noWrite: true,
    sampleInputSemantics:
      "caller_supplies_values_after_selector_window_selection_resolution",
    evaluationStatus: "evaluated",
    output,
    targetParameterDefinitionId: series.target_parameter_definition_id,
    targetDimensionCode: target.dimension_code,
    targetUnitCode: target.canonical_unit_code,
    unitAlgebra,
    testPassed: unitAlgebra.status === "resolved",
    publishEligibleFromThisTest: false,
    publishBlockedReason:
      unitAlgebra.status === "resolved"
        ? "publish_governance_not_implemented"
        : "unit_algebra_unresolved",
    formulaExecutionEnabled: false,
    factWriteEnabled: false,
  };
}
