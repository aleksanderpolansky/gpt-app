import { supabase } from "../../../lib/supabase";
import {
  createFormulaRuleDraftV1,
  listFormulaRuleRegistryV1,
} from "./formula-rule-registry.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type AssignmentRow = {
  value_object_id: string;
  parameter_definition_id: string;
};

type DefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  description: string | null;
  dimension_code: string;
  value_type_code: string;
  canonical_unit_code: string;
};

type ProfileRow = {
  id: string;
  template_id: string;
  version_no: number;
};

type ProfileParameterRow = {
  profile_id: string;
  parameter_definition_id: string;
};

export type ConsequenceFormulaReadiness =
  | "awaiting_template"
  | "missing_active_v2_profile"
  | "source_parameter_not_in_profile"
  | "no_target_parameters"
  | "ready";

export type ConsequenceFormulaContextInput = {
  taskId: string;
  activityTemplateId: string | null;
  sourceValueObjectId: string;
  sourceParameterDefinitionId: string;
  targetValueObjectId: string;
  targetValueObjectTitle?: string | null;
};

export type ConsequenceTargetParameterCandidateV1 = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
};

export type ConsequenceFormulaDraftSummaryV1 = {
  seriesId: string;
  ruleCode: string;
  targetParameterDefinitionId: string;
  targetParameterTitle: string;
  seriesStatusCode: string;
  versionId: string | null;
  versionNo: number | null;
  versionStatusCode: string | null;
  draftState: string;
};

export type ConsequenceFormulaContextViewV1 = {
  activeImpactProfileId: string | null;
  activeImpactProfileVersionNo: number | null;
  sourceParameterInProfile: boolean;
  formulaDraftReadiness: ConsequenceFormulaReadiness;
  targetParameterCandidates: ConsequenceTargetParameterCandidateV1[];
  draftRules: ConsequenceFormulaDraftSummaryV1[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function compactUuid(value: string) {
  return value.replaceAll("-", "");
}

function contextKey(taskId: string, targetValueObjectId: string) {
  return `${taskId}|${targetValueObjectId}`;
}

function semanticKey(input: {
  activityTemplateId: string;
  sourceValueObjectId: string;
  sourceParameterDefinitionId: string;
  targetValueObjectId: string;
  targetParameterDefinitionId: string;
}) {
  return [
    input.activityTemplateId,
    input.sourceValueObjectId,
    input.sourceParameterDefinitionId,
    input.targetValueObjectId,
    input.targetParameterDefinitionId,
  ].join("|");
}

function systemRuleCode(input: {
  activityTemplateId: string;
  sourceValueObjectId: string;
  sourceParameterDefinitionId: string;
  targetValueObjectId: string;
  targetParameterDefinitionId: string;
}) {
  return [
    "system",
    "consequence",
    compactUuid(input.activityTemplateId),
    compactUuid(input.sourceValueObjectId),
    compactUuid(input.sourceParameterDefinitionId),
    compactUuid(input.targetValueObjectId),
    compactUuid(input.targetParameterDefinitionId),
  ].join(".");
}

function assertUuid(value: string, code: string) {
  if (!UUID_RE.test(value)) throw new Error(code);
}

async function readTargetParameterCandidates(
  targetValueObjectIds: string[],
): Promise<Map<string, ConsequenceTargetParameterCandidateV1[]>> {
  const targetIds = [
    ...new Set(targetValueObjectIds.filter((value) => UUID_RE.test(value))),
  ];
  const result = new Map<string, ConsequenceTargetParameterCandidateV1[]>();
  for (const targetId of targetIds) result.set(targetId, []);
  if (targetIds.length === 0) return result;

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select("value_object_id,parameter_definition_id")
    .in("value_object_id", targetIds)
    .eq("status", "active")
    .limit(10000);

  if (assignmentError) {
    throw new Error(
      `CONSEQUENCE_FORMULA_TARGET_ASSIGNMENTS_READ_FAILED:${assignmentError.message}`,
    );
  }

  const assignments =
    (assignmentData as unknown as AssignmentRow[] | null) ?? [];
  const definitionIds = [
    ...new Set(assignments.map((row) => row.parameter_definition_id)),
  ];
  if (definitionIds.length === 0) return result;

  const { data: definitionData, error: definitionError } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code",
    )
    .in("id", definitionIds)
    .eq("scope_code", "system")
    .eq("status", "active")
    .limit(10000);

  if (definitionError) {
    throw new Error(
      `CONSEQUENCE_FORMULA_TARGET_PARAMETERS_READ_FAILED:${definitionError.message}`,
    );
  }

  const definitions =
    (definitionData as unknown as DefinitionRow[] | null) ?? [];
  const definitionById = new Map(
    definitions.map((row) => [
      row.id,
      {
        id: row.id,
        parameterCode: row.parameter_code,
        title: row.title,
        description: row.description,
        dimensionCode: row.dimension_code,
        valueTypeCode: row.value_type_code,
        canonicalUnitCode: row.canonical_unit_code,
      } satisfies ConsequenceTargetParameterCandidateV1,
    ]),
  );

  const seenByTarget = new Map<string, Set<string>>();
  for (const targetId of targetIds) {
    seenByTarget.set(targetId, new Set<string>());
  }

  for (const assignment of assignments) {
    const definition = definitionById.get(assignment.parameter_definition_id);
    const seen = seenByTarget.get(assignment.value_object_id);
    const bucket = result.get(assignment.value_object_id);
    if (!definition || !seen || !bucket || seen.has(definition.id)) continue;

    seen.add(definition.id);
    bucket.push(definition);
  }

  for (const bucket of result.values()) {
    bucket.sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.parameterCode.localeCompare(right.parameterCode),
    );
  }

  return result;
}

async function readActiveV2Profiles(templateIds: string[]) {
  const ids = [
    ...new Set(templateIds.filter((value) => UUID_RE.test(value))),
  ];
  const result = new Map<string, ProfileRow>();
  if (ids.length === 0) return result;

  const { data, error } = await supabase
    .from("activity_template_impact_profiles_v1")
    .select("id,template_id,version_no")
    .in("template_id", ids)
    .eq("status", "active")
    .eq("routing_contract_code", "parameter_registry_v2")
    .order("version_no", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`CONSEQUENCE_FORMULA_PROFILE_READ_FAILED:${error.message}`);
  }

  for (const row of (data ?? []) as ProfileRow[]) {
    if (!result.has(row.template_id)) result.set(row.template_id, row);
  }

  return result;
}

async function readProfileParameterKeys(profileIds: string[]) {
  const ids = [
    ...new Set(profileIds.filter((value) => UUID_RE.test(value))),
  ];
  const result = new Set<string>();
  if (ids.length === 0) return result;

  const { data, error } = await supabase
    .from("activity_template_profile_parameters_v2")
    .select("profile_id,parameter_definition_id")
    .in("profile_id", ids)
    .limit(10000);

  if (error) {
    throw new Error(
      `CONSEQUENCE_FORMULA_PROFILE_PARAMETERS_READ_FAILED:${error.message}`,
    );
  }

  for (const row of (data ?? []) as ProfileParameterRow[]) {
    result.add(`${row.profile_id}|${row.parameter_definition_id}`);
  }

  return result;
}

function readDraftState(metadata: unknown): string {
  return text(asRecord(metadata).draftState) || "draft";
}

export async function loadConsequenceFormulaContextsV1(
  contexts: ConsequenceFormulaContextInput[],
) {
  const validContexts = contexts.filter(
    (item) =>
      UUID_RE.test(item.taskId) &&
      UUID_RE.test(item.sourceValueObjectId) &&
      UUID_RE.test(item.sourceParameterDefinitionId) &&
      UUID_RE.test(item.targetValueObjectId),
  );

  const [parameterMap, profileMap, registry] = await Promise.all([
    readTargetParameterCandidates(
      validContexts.map((item) => item.targetValueObjectId),
    ),
    readActiveV2Profiles(
      validContexts
        .map((item) => item.activityTemplateId)
        .filter((value): value is string => Boolean(value)),
    ),
    listFormulaRuleRegistryV1(),
  ]);

  const profileParameterKeys = await readProfileParameterKeys(
    [...profileMap.values()].map((profile) => profile.id),
  );

  const seriesBySemanticKey = new Map<string, (typeof registry)[number]>();
  for (const series of registry) {
    if (series.scope_code !== "system" || series.status_code === "archived") {
      continue;
    }

    seriesBySemanticKey.set(
      semanticKey({
        activityTemplateId: series.activity_template_id,
        sourceValueObjectId: series.source_value_object_id,
        sourceParameterDefinitionId: series.source_parameter_definition_id,
        targetValueObjectId: series.target_value_object_id,
        targetParameterDefinitionId: series.target_parameter_definition_id,
      }),
      series,
    );
  }

  const result = new Map<string, ConsequenceFormulaContextViewV1>();

  for (const context of validContexts) {
    const targetParameters =
      parameterMap.get(context.targetValueObjectId) ?? [];
    const profile = context.activityTemplateId
      ? profileMap.get(context.activityTemplateId) ?? null
      : null;
    const sourceParameterInProfile = Boolean(
      profile &&
        profileParameterKeys.has(
          `${profile.id}|${context.sourceParameterDefinitionId}`,
        ),
    );

    let formulaDraftReadiness: ConsequenceFormulaReadiness;
    if (!context.activityTemplateId) {
      formulaDraftReadiness = "awaiting_template";
    } else if (!profile) {
      formulaDraftReadiness = "missing_active_v2_profile";
    } else if (!sourceParameterInProfile) {
      formulaDraftReadiness = "source_parameter_not_in_profile";
    } else if (targetParameters.length === 0) {
      formulaDraftReadiness = "no_target_parameters";
    } else {
      formulaDraftReadiness = "ready";
    }

    const draftRules: ConsequenceFormulaDraftSummaryV1[] = [];

    if (context.activityTemplateId) {
      for (const parameter of targetParameters) {
        const series = seriesBySemanticKey.get(
          semanticKey({
            activityTemplateId: context.activityTemplateId,
            sourceValueObjectId: context.sourceValueObjectId,
            sourceParameterDefinitionId:
              context.sourceParameterDefinitionId,
            targetValueObjectId: context.targetValueObjectId,
            targetParameterDefinitionId: parameter.id,
          }),
        );
        if (!series) continue;

        const version = series.versions[0] ?? null;
        draftRules.push({
          seriesId: series.id,
          ruleCode: series.rule_code,
          targetParameterDefinitionId: parameter.id,
          targetParameterTitle: parameter.title,
          seriesStatusCode: series.status_code,
          versionId: version?.id ?? null,
          versionNo: version?.version_no ?? null,
          versionStatusCode: version?.status_code ?? null,
          draftState: readDraftState(version?.metadata_json),
        });
      }
    }

    result.set(contextKey(context.taskId, context.targetValueObjectId), {
      activeImpactProfileId: profile?.id ?? null,
      activeImpactProfileVersionNo: profile?.version_no ?? null,
      sourceParameterInProfile,
      formulaDraftReadiness,
      targetParameterCandidates: targetParameters,
      draftRules,
    });
  }

  return result;
}

export async function createConsequenceFormulaDraftV1(input: {
  taskId: string;
  activityTemplateId: string;
  sourceValueObjectId: string;
  sourceParameterDefinitionId: string;
  targetValueObjectId: string;
  targetValueObjectTitle?: string | null;
  targetParameterDefinitionId: string;
  curatorMetadata?: JsonRecord;
}) {
  assertUuid(input.taskId, "CONSEQUENCE_FORMULA_TASK_ID_INVALID");
  assertUuid(
    input.activityTemplateId,
    "CONSEQUENCE_FORMULA_TEMPLATE_ID_INVALID",
  );
  assertUuid(
    input.sourceValueObjectId,
    "CONSEQUENCE_FORMULA_SOURCE_OBJECT_ID_INVALID",
  );
  assertUuid(
    input.sourceParameterDefinitionId,
    "CONSEQUENCE_FORMULA_SOURCE_PARAMETER_ID_INVALID",
  );
  assertUuid(
    input.targetValueObjectId,
    "CONSEQUENCE_FORMULA_TARGET_OBJECT_ID_INVALID",
  );
  assertUuid(
    input.targetParameterDefinitionId,
    "CONSEQUENCE_FORMULA_TARGET_PARAMETER_ID_INVALID",
  );

  const contextMap = await loadConsequenceFormulaContextsV1([
    {
      taskId: input.taskId,
      activityTemplateId: input.activityTemplateId,
      sourceValueObjectId: input.sourceValueObjectId,
      sourceParameterDefinitionId: input.sourceParameterDefinitionId,
      targetValueObjectId: input.targetValueObjectId,
      targetValueObjectTitle: input.targetValueObjectTitle,
    },
  ]);

  const context = contextMap.get(
    contextKey(input.taskId, input.targetValueObjectId),
  );
  if (!context) throw new Error("CONSEQUENCE_FORMULA_CONTEXT_NOT_FOUND");

  if (context.formulaDraftReadiness !== "ready") {
    throw new Error(
      `CONSEQUENCE_FORMULA_DRAFT_NOT_READY_${context.formulaDraftReadiness.toUpperCase()}`,
    );
  }

  const targetParameter =
    context.targetParameterCandidates.find(
      (item) => item.id === input.targetParameterDefinitionId,
    ) ?? null;
  if (!targetParameter) {
    throw new Error(
      "CONSEQUENCE_FORMULA_TARGET_PARAMETER_NOT_ASSIGNED_OR_NOT_SYSTEM_ACTIVE",
    );
  }
  if (!context.activeImpactProfileId) {
    throw new Error("CONSEQUENCE_FORMULA_ACTIVE_PROFILE_NOT_FOUND");
  }

  const ruleCode = systemRuleCode({
    activityTemplateId: input.activityTemplateId,
    sourceValueObjectId: input.sourceValueObjectId,
    sourceParameterDefinitionId: input.sourceParameterDefinitionId,
    targetValueObjectId: input.targetValueObjectId,
    targetParameterDefinitionId: input.targetParameterDefinitionId,
  });

  const registry = await listFormulaRuleRegistryV1();
  const existing = registry.find((series) => series.rule_code === ruleCode);
  if (existing) {
    if (existing.status_code === "archived") {
      throw new Error("CONSEQUENCE_FORMULA_EXISTING_SERIES_ARCHIVED");
    }

    const version = existing.versions[0] ?? null;
    return {
      duplicate: true,
      ruleCode,
      seriesId: existing.id,
      versionId: version?.id ?? null,
      versionNo: version?.version_no ?? null,
      versionStatusCode: version?.status_code ?? null,
      draftState: readDraftState(version?.metadata_json),
    };
  }

  const commonMetadata = {
    consequenceTaskId: input.taskId,
    authoringSurface: "consequence_constructor",
    formulaState: "awaiting_expression",
    draftState: "awaiting_formula",
    draftIncomplete: true,
    sourceValueObjectId: input.sourceValueObjectId,
    sourceParameterDefinitionId: input.sourceParameterDefinitionId,
    targetValueObjectId: input.targetValueObjectId,
    targetValueObjectTitleSnapshot:
      text(input.targetValueObjectTitle) || input.targetValueObjectId,
    targetParameterDefinitionId: input.targetParameterDefinitionId,
    targetParameterTitleSnapshot: targetParameter.title,
    targetParameterCodeSnapshot: targetParameter.parameterCode,
    targetParameterUnitSnapshot: targetParameter.canonicalUnitCode,
    ...(input.curatorMetadata ?? {}),
  };

  const created = await createFormulaRuleDraftV1({
    ruleCode,
    scopeCode: "system",
    activityTemplateId: input.activityTemplateId,
    impactProfileId: context.activeImpactProfileId,
    sourceValueObjectId: input.sourceValueObjectId,
    sourceParameterDefinitionId: input.sourceParameterDefinitionId,
    targetValueObjectId: input.targetValueObjectId,
    targetParameterDefinitionId: input.targetParameterDefinitionId,
    resolutionModeCode: "parallel",
    inputs: [
      {
        key: "source",
        kind: "source_fact",
        parameterDefinitionId: input.sourceParameterDefinitionId,
        valueObjectId: input.sourceValueObjectId,
        window: "event",
        selection: "latest",
        required: true,
      },
    ],
    condition: {},
    expression: { op: "literal", value: null },
    triggers: ["fact_created", "fact_corrected"],
    resultFactRole: "result",
    resultUnitCode: targetParameter.canonicalUnitCode,
    missingInputPolicy: "insufficient_data",
    seriesMetadata: {
      ...commonMetadata,
      placeholderExpression: true,
    },
    versionMetadata: {
      ...commonMetadata,
      placeholderExpression: true,
      resultFactRoleProvisional: true,
    },
  });

  return {
    duplicate: false,
    ruleCode,
    seriesId: created.series.id,
    versionId: created.version.id,
    versionNo: created.version.version_no,
    versionStatusCode: created.version.status_code,
    draftState: "awaiting_formula",
  };
}
