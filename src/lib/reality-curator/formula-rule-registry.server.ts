import { supabase } from "../../../lib/supabase";
import {
  FORMULA_EXPRESSION_LANGUAGE,
  FORMULA_MISSING_INPUT_POLICIES,
  FORMULA_RESULT_FACT_ROLES,
  FORMULA_RULE_RESOLUTION_MODES,
  FORMULA_RULE_SCOPES,
  type FormulaExpressionNodeV1,
  type FormulaInputSelectorV1,
  type FormulaMissingInputPolicy,
  type FormulaResultFactRole,
  type FormulaRuleResolutionMode,
  type FormulaRuleScope,
  isFormulaExpressionNodeV1,
} from "./formula-rule-registry.contract";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RULE_CODE_RE = /^[a-z][a-z0-9_.:-]{2,239}$/;

type JsonRecord = Record<string, unknown>;

type FormulaRuleSeriesRow = {
  id: string;
  rule_code: string;
  scope_code: FormulaRuleScope;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  organization_id: string | null;
  activity_template_id: string;
  impact_profile_id: string;
  source_value_object_id: string;
  source_parameter_definition_id: string;
  target_value_object_id: string;
  target_parameter_definition_id: string;
  base_rule_series_id: string | null;
  resolution_mode_code: FormulaRuleResolutionMode;
  status_code: "active" | "inactive" | "archived";
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

type FormulaRuleVersionRow = {
  id: string;
  rule_series_id: string;
  version_no: number;
  expression_language_code: string;
  input_contract_json: unknown;
  condition_contract_json: unknown;
  expression_contract_json: unknown;
  trigger_contract_json: unknown;
  result_fact_role_code: FormulaResultFactRole;
  result_unit_code: string | null;
  missing_input_policy_code: FormulaMissingInputPolicy;
  status_code:
    | "draft"
    | "testing"
    | "published"
    | "disabled"
    | "superseded"
    | "archived";
  supersedes_rule_version_id: string | null;
  published_at: string | null;
  valid_from: string;
  valid_to: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type CreateFormulaRuleDraftInput = {
  ruleCode: string;
  scopeCode: FormulaRuleScope;
  ownerUserId?: string | null;
  ownerActorId?: string | null;
  organizationId?: string | null;
  activityTemplateId: string;
  impactProfileId: string;
  sourceValueObjectId: string;
  sourceParameterDefinitionId: string;
  targetValueObjectId: string;
  targetParameterDefinitionId: string;
  baseRuleSeriesId?: string | null;
  resolutionModeCode?: FormulaRuleResolutionMode;
  inputs?: FormulaInputSelectorV1[];
  condition?: JsonRecord;
  expression: FormulaExpressionNodeV1;
  triggers?: Array<
    "fact_created" | "fact_corrected" | "standard_changed" | "time_boundary"
  >;
  resultFactRole?: FormulaResultFactRole;
  resultUnitCode?: string | null;
  missingInputPolicy?: FormulaMissingInputPolicy;
  seriesMetadata?: JsonRecord;
  versionMetadata?: JsonRecord;
};

export type UpdateFormulaRuleDraftInput = {
  ruleVersionId: string;
  inputs?: FormulaInputSelectorV1[];
  condition?: JsonRecord;
  expression?: FormulaExpressionNodeV1;
  triggers?: Array<
    "fact_created" | "fact_corrected" | "standard_changed" | "time_boundary"
  >;
  resultFactRole?: FormulaResultFactRole;
  resultUnitCode?: string | null;
  missingInputPolicy?: FormulaMissingInputPolicy;
  versionMetadata?: JsonRecord;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertUuid(value: string, code: string) {
  if (!UUID_RE.test(value)) throw new Error(code);
}

function assertNullableUuid(value: string | null | undefined, code: string) {
  if (value === null || value === undefined || value === "") return;
  assertUuid(value, code);
}

function assertScopeOwnerShape(input: CreateFormulaRuleDraftInput) {
  const ownerUserId = text(input.ownerUserId);
  const ownerActorId = text(input.ownerActorId);
  const organizationId = text(input.organizationId);

  if (input.scopeCode === "system") {
    if (ownerUserId || ownerActorId || organizationId) {
      throw new Error("FORMULA_RULE_SYSTEM_OWNER_FIELDS_MUST_BE_EMPTY");
    }
    return;
  }

  if (input.scopeCode === "user") {
    if (!ownerUserId || !ownerActorId || organizationId) {
      throw new Error("FORMULA_RULE_USER_OWNER_FIELDS_INVALID");
    }
    assertUuid(ownerUserId, "FORMULA_RULE_OWNER_USER_ID_INVALID");
    assertUuid(ownerActorId, "FORMULA_RULE_OWNER_ACTOR_ID_INVALID");
    return;
  }

  if (!organizationId || ownerUserId || ownerActorId) {
    throw new Error("FORMULA_RULE_ORGANIZATION_OWNER_FIELDS_INVALID");
  }
  assertUuid(organizationId, "FORMULA_RULE_ORGANIZATION_ID_INVALID");
}

function normalizeInputs(value: FormulaInputSelectorV1[] | undefined) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 128) {
    throw new Error("FORMULA_RULE_INPUTS_INVALID");
  }

  const keys = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new Error("FORMULA_RULE_INPUT_INVALID");
    }
    const key = text(item.key);
    if (!key || keys.has(key)) {
      throw new Error("FORMULA_RULE_INPUT_KEY_INVALID_OR_DUPLICATE");
    }
    keys.add(key);

    if (item.parameterDefinitionId) {
      assertUuid(
        item.parameterDefinitionId,
        "FORMULA_RULE_INPUT_PARAMETER_ID_INVALID",
      );
    }
    if (item.valueObjectId) {
      assertUuid(item.valueObjectId, "FORMULA_RULE_INPUT_OBJECT_ID_INVALID");
    }
  }

  return value;
}

function normalizeTriggers(
  value:
    | Array<
        "fact_created" | "fact_corrected" | "standard_changed" | "time_boundary"
      >
    | undefined,
) {
  const triggers = value ?? ["fact_created", "fact_corrected"];
  const allowed = new Set([
    "fact_created",
    "fact_corrected",
    "standard_changed",
    "time_boundary",
  ]);

  if (
    !Array.isArray(triggers) ||
    triggers.length === 0 ||
    triggers.length > 16 ||
    triggers.some((item) => !allowed.has(item))
  ) {
    throw new Error("FORMULA_RULE_TRIGGERS_INVALID");
  }

  return [...new Set(triggers)];
}

function normalizeCreateInput(input: CreateFormulaRuleDraftInput) {
  if (!RULE_CODE_RE.test(text(input.ruleCode))) {
    throw new Error("FORMULA_RULE_CODE_INVALID");
  }
  if (!FORMULA_RULE_SCOPES.includes(input.scopeCode)) {
    throw new Error("FORMULA_RULE_SCOPE_INVALID");
  }

  assertScopeOwnerShape(input);

  assertUuid(
    input.activityTemplateId,
    "FORMULA_RULE_ACTIVITY_TEMPLATE_ID_INVALID",
  );
  assertUuid(input.impactProfileId, "FORMULA_RULE_IMPACT_PROFILE_ID_INVALID");
  assertUuid(
    input.sourceValueObjectId,
    "FORMULA_RULE_SOURCE_VALUE_OBJECT_ID_INVALID",
  );
  assertUuid(
    input.sourceParameterDefinitionId,
    "FORMULA_RULE_SOURCE_PARAMETER_ID_INVALID",
  );
  assertUuid(
    input.targetValueObjectId,
    "FORMULA_RULE_TARGET_VALUE_OBJECT_ID_INVALID",
  );
  assertUuid(
    input.targetParameterDefinitionId,
    "FORMULA_RULE_TARGET_PARAMETER_ID_INVALID",
  );
  assertNullableUuid(
    input.baseRuleSeriesId,
    "FORMULA_RULE_BASE_RULE_SERIES_ID_INVALID",
  );

  const resolutionModeCode = input.resolutionModeCode ?? "parallel";
  if (!FORMULA_RULE_RESOLUTION_MODES.includes(resolutionModeCode)) {
    throw new Error("FORMULA_RULE_RESOLUTION_MODE_INVALID");
  }

  if (!isFormulaExpressionNodeV1(input.expression)) {
    throw new Error("FORMULA_RULE_EXPRESSION_INVALID");
  }

  const resultFactRole = input.resultFactRole ?? "result";
  if (!FORMULA_RESULT_FACT_ROLES.includes(resultFactRole)) {
    throw new Error("FORMULA_RULE_RESULT_ROLE_INVALID");
  }

  const missingInputPolicy = input.missingInputPolicy ?? "insufficient_data";
  if (!FORMULA_MISSING_INPUT_POLICIES.includes(missingInputPolicy)) {
    throw new Error("FORMULA_RULE_MISSING_INPUT_POLICY_INVALID");
  }

  const condition = input.condition ?? {};
  if (!isRecord(condition)) throw new Error("FORMULA_RULE_CONDITION_INVALID");

  const seriesMetadata = input.seriesMetadata ?? {};
  const versionMetadata = input.versionMetadata ?? {};
  if (!isRecord(seriesMetadata) || !isRecord(versionMetadata)) {
    throw new Error("FORMULA_RULE_METADATA_INVALID");
  }

  return {
    ruleCode: text(input.ruleCode),
    scopeCode: input.scopeCode,
    ownerUserId: text(input.ownerUserId) || null,
    ownerActorId: text(input.ownerActorId) || null,
    organizationId: text(input.organizationId) || null,
    activityTemplateId: input.activityTemplateId,
    impactProfileId: input.impactProfileId,
    sourceValueObjectId: input.sourceValueObjectId,
    sourceParameterDefinitionId: input.sourceParameterDefinitionId,
    targetValueObjectId: input.targetValueObjectId,
    targetParameterDefinitionId: input.targetParameterDefinitionId,
    baseRuleSeriesId: text(input.baseRuleSeriesId) || null,
    resolutionModeCode,
    inputs: normalizeInputs(input.inputs),
    condition,
    expression: input.expression,
    triggers: normalizeTriggers(input.triggers),
    resultFactRole,
    resultUnitCode: text(input.resultUnitCode) || null,
    missingInputPolicy,
    seriesMetadata,
    versionMetadata,
  };
}

export async function listFormulaRuleRegistryV1() {
  const { data: seriesData, error: seriesError } = await supabase
    .from("activity_fact_calculation_rule_series_v1")
    .select(
      "id,rule_code,scope_code,owner_user_id,owner_actor_id,organization_id,activity_template_id,impact_profile_id,source_value_object_id,source_parameter_definition_id,target_value_object_id,target_parameter_definition_id,base_rule_series_id,resolution_mode_code,status_code,metadata_json,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (seriesError) {
    throw new Error(`FORMULA_RULE_SERIES_LIST_FAILED:${seriesError.message}`);
  }

  const seriesRows =
    (seriesData as unknown as FormulaRuleSeriesRow[] | null) ?? [];
  if (seriesRows.length === 0) return [];

  const { data: versionData, error: versionError } = await supabase
    .from("activity_fact_calculation_rule_versions_v1")
    .select(
      "id,rule_series_id,version_no,expression_language_code,input_contract_json,condition_contract_json,expression_contract_json,trigger_contract_json,result_fact_role_code,result_unit_code,missing_input_policy_code,status_code,supersedes_rule_version_id,published_at,valid_from,valid_to,metadata_json,created_at,updated_at",
    )
    .in(
      "rule_series_id",
      seriesRows.map((row) => row.id),
    )
    .order("version_no", { ascending: false })
    .limit(5000);

  if (versionError) {
    throw new Error(`FORMULA_RULE_VERSION_LIST_FAILED:${versionError.message}`);
  }

  const versions =
    (versionData as unknown as FormulaRuleVersionRow[] | null) ?? [];
  const versionsBySeries = new Map<string, FormulaRuleVersionRow[]>();

  for (const version of versions) {
    const bucket = versionsBySeries.get(version.rule_series_id) ?? [];
    bucket.push(version);
    versionsBySeries.set(version.rule_series_id, bucket);
  }

  return seriesRows.map((series) => ({
    ...series,
    versions: versionsBySeries.get(series.id) ?? [],
  }));
}

export async function createFormulaRuleDraftV1(
  input: CreateFormulaRuleDraftInput,
) {
  const normalized = normalizeCreateInput(input);

  const { data: seriesData, error: seriesError } = await supabase
    .from("activity_fact_calculation_rule_series_v1")
    .insert({
      rule_code: normalized.ruleCode,
      scope_code: normalized.scopeCode,
      owner_user_id: normalized.ownerUserId,
      owner_actor_id: normalized.ownerActorId,
      organization_id: normalized.organizationId,
      activity_template_id: normalized.activityTemplateId,
      impact_profile_id: normalized.impactProfileId,
      source_value_object_id: normalized.sourceValueObjectId,
      source_parameter_definition_id: normalized.sourceParameterDefinitionId,
      target_value_object_id: normalized.targetValueObjectId,
      target_parameter_definition_id: normalized.targetParameterDefinitionId,
      base_rule_series_id: normalized.baseRuleSeriesId,
      resolution_mode_code: normalized.resolutionModeCode,
      status_code: "active",
      metadata_json: normalized.seriesMetadata,
    })
    .select(
      "id,rule_code,scope_code,owner_user_id,owner_actor_id,organization_id,activity_template_id,impact_profile_id,source_value_object_id,source_parameter_definition_id,target_value_object_id,target_parameter_definition_id,base_rule_series_id,resolution_mode_code,status_code,metadata_json,created_at,updated_at",
    )
    .single();

  if (seriesError || !seriesData) {
    throw new Error(
      `FORMULA_RULE_SERIES_CREATE_FAILED:${seriesError?.message ?? "NO_ROW"}`,
    );
  }

  const series = seriesData as unknown as FormulaRuleSeriesRow;

  const { data: versionData, error: versionError } = await supabase
    .from("activity_fact_calculation_rule_versions_v1")
    .insert({
      rule_series_id: series.id,
      version_no: 1,
      expression_language_code: FORMULA_EXPRESSION_LANGUAGE,
      input_contract_json: normalized.inputs,
      condition_contract_json: normalized.condition,
      expression_contract_json: normalized.expression,
      trigger_contract_json: normalized.triggers,
      result_fact_role_code: normalized.resultFactRole,
      result_unit_code: normalized.resultUnitCode,
      missing_input_policy_code: normalized.missingInputPolicy,
      status_code: "draft",
      metadata_json: normalized.versionMetadata,
    })
    .select(
      "id,rule_series_id,version_no,expression_language_code,input_contract_json,condition_contract_json,expression_contract_json,trigger_contract_json,result_fact_role_code,result_unit_code,missing_input_policy_code,status_code,supersedes_rule_version_id,published_at,valid_from,valid_to,metadata_json,created_at,updated_at",
    )
    .single();

  if (versionError || !versionData) {
    const { error: cleanupError } = await supabase
      .from("activity_fact_calculation_rule_series_v1")
      .delete()
      .eq("id", series.id);

    if (cleanupError) {
      throw new Error(
        `FORMULA_RULE_VERSION_CREATE_FAILED_AND_SERIES_CLEANUP_FAILED:${versionError?.message ?? "NO_ROW"}:${cleanupError.message}`,
      );
    }

    throw new Error(
      `FORMULA_RULE_VERSION_CREATE_FAILED:${versionError?.message ?? "NO_ROW"}`,
    );
  }

  return {
    series,
    version: versionData as unknown as FormulaRuleVersionRow,
  };
}

export async function updateFormulaRuleDraftV1(
  input: UpdateFormulaRuleDraftInput,
) {
  assertUuid(input.ruleVersionId, "FORMULA_RULE_VERSION_ID_INVALID");

  const { data: currentData, error: currentError } = await supabase
    .from("activity_fact_calculation_rule_versions_v1")
    .select(
      "id,rule_series_id,version_no,expression_language_code,input_contract_json,condition_contract_json,expression_contract_json,trigger_contract_json,result_fact_role_code,result_unit_code,missing_input_policy_code,status_code,supersedes_rule_version_id,published_at,valid_from,valid_to,metadata_json,created_at,updated_at",
    )
    .eq("id", input.ruleVersionId)
    .limit(1);

  if (currentError) {
    throw new Error(`FORMULA_RULE_VERSION_READ_FAILED:${currentError.message}`);
  }

  const current =
    ((currentData as unknown as FormulaRuleVersionRow[] | null) ?? [])[0] ??
    null;

  if (!current) throw new Error("FORMULA_RULE_VERSION_NOT_FOUND");
  if (current.status_code !== "draft" && current.status_code !== "testing") {
    throw new Error("FORMULA_RULE_VERSION_NOT_EDITABLE");
  }

  const patch: JsonRecord = {};

  if (input.inputs !== undefined) {
    patch.input_contract_json = normalizeInputs(input.inputs);
  }

  if (input.condition !== undefined) {
    if (!isRecord(input.condition)) {
      throw new Error("FORMULA_RULE_CONDITION_INVALID");
    }
    patch.condition_contract_json = input.condition;
  }

  if (input.expression !== undefined) {
    if (!isFormulaExpressionNodeV1(input.expression)) {
      throw new Error("FORMULA_RULE_EXPRESSION_INVALID");
    }
    patch.expression_contract_json = input.expression;
  }

  if (input.triggers !== undefined) {
    patch.trigger_contract_json = normalizeTriggers(input.triggers);
  }

  if (input.resultFactRole !== undefined) {
    if (!FORMULA_RESULT_FACT_ROLES.includes(input.resultFactRole)) {
      throw new Error("FORMULA_RULE_RESULT_ROLE_INVALID");
    }
    patch.result_fact_role_code = input.resultFactRole;
  }

  if (input.resultUnitCode !== undefined) {
    patch.result_unit_code = text(input.resultUnitCode) || null;
  }

  if (input.missingInputPolicy !== undefined) {
    if (!FORMULA_MISSING_INPUT_POLICIES.includes(input.missingInputPolicy)) {
      throw new Error("FORMULA_RULE_MISSING_INPUT_POLICY_INVALID");
    }
    patch.missing_input_policy_code = input.missingInputPolicy;
  }

  if (input.versionMetadata !== undefined) {
    if (!isRecord(input.versionMetadata)) {
      throw new Error("FORMULA_RULE_METADATA_INVALID");
    }
    patch.metadata_json = input.versionMetadata;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("FORMULA_RULE_DRAFT_PATCH_EMPTY");
  }

  const { data: updatedData, error: updatedError } = await supabase
    .from("activity_fact_calculation_rule_versions_v1")
    .update(patch)
    .eq("id", current.id)
    .select(
      "id,rule_series_id,version_no,expression_language_code,input_contract_json,condition_contract_json,expression_contract_json,trigger_contract_json,result_fact_role_code,result_unit_code,missing_input_policy_code,status_code,supersedes_rule_version_id,published_at,valid_from,valid_to,metadata_json,created_at,updated_at",
    )
    .single();

  if (updatedError || !updatedData) {
    throw new Error(
      `FORMULA_RULE_DRAFT_UPDATE_FAILED:${updatedError?.message ?? "NO_ROW"}`,
    );
  }

  return updatedData as unknown as FormulaRuleVersionRow;
}
