import crypto from "node:crypto";

import { supabase } from "../../../lib/supabase";
import { ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1 } from "./activity-intake-source-fact-materializer.server";

export const ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1 =
  "ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1" as const;

const BASIC_ANALYSIS_CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type PersistedMissingValue = {
  parameterDefinitionId: string;
  parameterCode: string;
  valueObjectId: string;
  reasonCode: string;
};

type ParameterDefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  value_type_code: string;
  canonical_unit_code: string | null;
  allow_negative: boolean;
  scope_code: string;
  status: string;
};

type AssignmentRow = {
  id: string;
  value_object_id: string;
  parameter_definition_id: string;
  scope_code: string;
  assignment_scope_code: string;
  status: string;
};

type ValueObjectRow = {
  id: string;
  canonical_key: string;
  title: string;
  scope_code: string;
  ontology_node_role_code: string | null;
  status: string;
};

type ProfileRow = {
  id: string;
  template_id: string;
  version_no: number;
  routing_contract_code: string | null;
  metadata_json: unknown;
};

type ActivityRow = {
  id: string;
  acting_as_actor_id: string | null;
  activity_role_code: string | null;
};

type WriterRow = {
  canonicalKey: string;
  parameterCode: string;
  unit: string;
  valueNumeric?: number;
  valueText?: string;
  rawFragment: string;
  normalizedFragment: string;
  semanticMatchMethodCode: "user_confirmed";
  sourceType: "ai_extraction";
  confidence: number;
  factStatus: "confirmed" | "proposed";
  isUserConfirmed: boolean;
  valueOriginCode: "user_explicit";
  sourceReliabilityCode: "user_reported";
  sourceSnapshotJson: JsonRecord;
};

export type E03SourceFactSupplementOption = PersistedMissingValue & {
  parameterTitle: string;
  targetTitle: string;
  valueTypeCode: string;
  canonicalUnitCode: string | null;
  allowNegative: boolean;
};

export type E03SourceFactSupplementResult = {
  contract: typeof ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1;
  activityEventId: string;
  parameterDefinitionId: string;
  valueObjectId: string;
  factsWritten: number;
  factIds: string[];
  measureIds: string[];
  completeness: "complete" | "partial";
  missingValues: E03SourceFactSupplementOption[];
  analysis: JsonRecord;
  writerResult: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.map((value) => text(value)).filter(Boolean)),
  );
}

function readPersistedMissingValues(value: unknown): PersistedMissingValue[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const rows: PersistedMissingValue[] = [];

  for (const item of value) {
    const row = asRecord(item);
    const parameterDefinitionId = text(row.parameterDefinitionId);
    const parameterCode = text(row.parameterCode).toLowerCase();
    const valueObjectId = text(row.valueObjectId);
    const reasonCode = text(row.reasonCode);

    if (
      !UUID_RE.test(parameterDefinitionId) ||
      !/^[a-z][a-z0-9_]{0,79}$/.test(parameterCode) ||
      !UUID_RE.test(valueObjectId) ||
      !reasonCode
    ) {
      continue;
    }

    const key = `${parameterDefinitionId}|${valueObjectId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      parameterDefinitionId,
      parameterCode,
      valueObjectId,
      reasonCode,
    });
  }

  return rows;
}

function readSourceBindings(value: unknown) {
  if (!Array.isArray(value)) return null;

  const rows = value
    .map((item) => asRecord(item))
    .map((row) => ({
      parameterDefinitionId: text(row.parameterDefinitionId),
      valueObjectId: text(row.valueObjectId),
    }));

  if (
    rows.length === 0 ||
    rows.some(
      (row) =>
        !UUID_RE.test(row.parameterDefinitionId) ||
        !UUID_RE.test(row.valueObjectId),
    ) ||
    new Set(
      rows.map(
        (row) => `${row.parameterDefinitionId}|${row.valueObjectId}`,
      ),
    ).size !== rows.length
  ) {
    throw new Error("E03_SUPPLEMENT_SOURCE_BINDING_INVALID");
  }

  return rows;
}

function writerRowsFromResult(value: unknown) {
  const result = asRecord(value);
  const rows = Array.isArray(result.rows) ? result.rows.map(asRecord) : [];
  return {
    status: text(result.writeStatus),
    factIds: rows.map((row) => text(row.factId)).filter(Boolean),
    measureIds: rows.map((row) => text(row.measureId)).filter(Boolean),
  };
}

function normalizeNumericInput(rawValue: string): number {
  const compact = rawValue
    .replace(/\u00a0/gu, " ")
    .trim()
    .replace(/\s+/gu, "");

  if (!/^[+-]?\d+(?:[.,]\d+)?$/u.test(compact)) {
    throw new Error("E03_SUPPLEMENT_VALUE_NUMERIC_REQUIRED");
  }

  const parsed = Number(compact.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error("E03_SUPPLEMENT_VALUE_NUMERIC_REQUIRED");
  }

  return parsed;
}

function normalizeBooleanInput(rawValue: string): string {
  const token = rawValue.trim().toLocaleLowerCase();
  const trueTokens = new Set([
    "true",
    "1",
    "yes",
    "y",
    "да",
    "так",
    "ja",
    "si",
    "sí",
    "ano",
  ]);
  const falseTokens = new Set([
    "false",
    "0",
    "no",
    "n",
    "нет",
    "ні",
    "nie",
    "nein",
    "ne",
  ]);

  if (trueTokens.has(token)) return "true";
  if (falseTokens.has(token)) return "false";

  throw new Error("E03_SUPPLEMENT_VALUE_BOOLEAN_REQUIRED");
}

function normalizeTimestampInput(rawValue: string): string {
  const parsed = new Date(rawValue.trim());
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("E03_SUPPLEMENT_VALUE_TIMESTAMP_REQUIRED");
  }
  return parsed.toISOString();
}

function parseManualValue(
  option: E03SourceFactSupplementOption,
  rawValue: string,
): {
  unit: string;
  valueNumeric?: number;
  valueText?: string;
} {
  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.length > 4000) {
    throw new Error("E03_SUPPLEMENT_VALUE_REQUIRED");
  }

  const unit = text(option.canonicalUnitCode) || option.valueTypeCode;

  if (option.valueTypeCode === "numeric") {
    const valueNumeric = normalizeNumericInput(trimmed);
    if (!option.allowNegative && valueNumeric < 0) {
      throw new Error("E03_SUPPLEMENT_NEGATIVE_VALUE_NOT_ALLOWED");
    }
    return { unit, valueNumeric };
  }

  if (option.valueTypeCode === "boolean") {
    return {
      unit: unit || "boolean",
      valueText: normalizeBooleanInput(trimmed),
    };
  }

  if (option.valueTypeCode === "timestamp") {
    return {
      unit: unit || "timestamp",
      valueText: normalizeTimestampInput(trimmed),
    };
  }

  if (option.valueTypeCode === "text") {
    return {
      unit: unit || "text",
      valueText: trimmed,
    };
  }

  throw new Error(
    `E03_SUPPLEMENT_VALUE_TYPE_UNSUPPORTED:${option.valueTypeCode}`,
  );
}

async function readContext(input: {
  appUserId: string;
  activityEventId: string;
}) {
  const { data: signalData, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select("id,output_event_id,normalized_preview_json")
    .eq("user_id", input.appUserId)
    .eq("source_type", "manual_chat")
    .eq("output_event_id", input.activityEventId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (signalError) {
    throw new Error(`E03_SUPPLEMENT_SIGNAL_READ_FAILED:${signalError.message}`);
  }
  if (!signalData) {
    throw new Error("E03_SUPPLEMENT_SIGNAL_NOT_FOUND");
  }

  const normalizedPreview = asRecord(signalData.normalized_preview_json);
  const analysis = asRecord(normalizedPreview.basicIntakeAnalysisV1);
  if (
    text(analysis.contract) !== BASIC_ANALYSIS_CONTRACT ||
    text(analysis.status) !== "completed" ||
    text(analysis.activityEventId) !== input.activityEventId
  ) {
    throw new Error("E03_SUPPLEMENT_COMPLETED_ANALYSIS_REQUIRED");
  }

  const materialization = asRecord(analysis.sourceFactMaterializationV1);
  const materializationStatus = text(materialization.status);
  const priorFactsWritten = finiteNumber(materialization.factsWritten) ?? 0;

  if (
    text(materialization.contract) !== ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1 ||
    !["materialized", "idempotent_replay"].includes(materializationStatus) ||
    priorFactsWritten < 1
  ) {
    throw new Error("E03_SUPPLEMENT_EXISTING_FACTS_REQUIRED");
  }

  const templateId = text(materialization.templateId);
  const profileId = text(materialization.profileId);
  const profileVersionNo = finiteNumber(materialization.profileVersionNo);
  if (
    !UUID_RE.test(templateId) ||
    !UUID_RE.test(profileId) ||
    profileVersionNo === null ||
    !Number.isInteger(profileVersionNo) ||
    profileVersionNo < 1
  ) {
    throw new Error("E03_SUPPLEMENT_MATERIALIZATION_CONTEXT_INVALID");
  }

  const missingValues = readPersistedMissingValues(materialization.missingValues);
  if (missingValues.length === 0) {
    throw new Error("E03_SUPPLEMENT_NO_MISSING_VALUES");
  }

  const { data: activityData, error: activityError } = await supabase
    .from("activity_events")
    .select("id,acting_as_actor_id,activity_role_code")
    .eq("id", input.activityEventId)
    .eq("user_id", input.appUserId)
    .maybeSingle();

  if (activityError) {
    throw new Error(`E03_SUPPLEMENT_ACTIVITY_READ_FAILED:${activityError.message}`);
  }
  if (!activityData) {
    throw new Error("E03_SUPPLEMENT_ACTIVITY_NOT_FOUND");
  }

  const activity = activityData as ActivityRow;
  const actorId = text(activity.acting_as_actor_id);
  if (!UUID_RE.test(actorId)) {
    throw new Error("E03_SUPPLEMENT_ACTIVITY_ACTOR_MISSING");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("activity_template_impact_profiles_v1")
    .select("id,template_id,version_no,routing_contract_code,metadata_json")
    .eq("id", profileId)
    .eq("template_id", templateId)
    .eq("version_no", profileVersionNo)
    .maybeSingle();

  if (profileError) {
    throw new Error(`E03_SUPPLEMENT_PROFILE_READ_FAILED:${profileError.message}`);
  }
  const profile = profileData as ProfileRow | null;
  if (!profile) {
    throw new Error("E03_SUPPLEMENT_PROFILE_NOT_FOUND");
  }
  if (profile.routing_contract_code !== "parameter_registry_v2") {
    throw new Error("E03_SUPPLEMENT_PROFILE_ROUTING_CONTRACT_INVALID");
  }

  const [profileParameterResult, profileObjectResult] = await Promise.all([
    supabase
      .from("activity_template_profile_parameters_v2")
      .select("parameter_definition_id")
      .eq("profile_id", profileId),
    supabase
      .from("activity_template_profile_object_links_v1")
      .select("target_value_object_id")
      .eq("profile_id", profileId),
  ]);

  if (profileParameterResult.error) {
    throw new Error(
      `E03_SUPPLEMENT_PROFILE_PARAMETER_READ_FAILED:${profileParameterResult.error.message}`,
    );
  }
  if (profileObjectResult.error) {
    throw new Error(
      `E03_SUPPLEMENT_PROFILE_OBJECT_READ_FAILED:${profileObjectResult.error.message}`,
    );
  }

  const profileParameterIds = uniqueStrings(
    (profileParameterResult.data ?? []).map(
      (row: unknown) => asRecord(row).parameter_definition_id,
    ),
  );
  const profileObjectIds = uniqueStrings(
    (profileObjectResult.data ?? []).map(
      (row: unknown) => asRecord(row).target_value_object_id,
    ),
  );

  if (profileParameterIds.length === 0 || profileObjectIds.length === 0) {
    throw new Error("E03_SUPPLEMENT_PROFILE_MAPPING_FOUNDATION_EMPTY");
  }

  const missingParameterIds = uniqueStrings(
    missingValues.map((row) => row.parameterDefinitionId),
  );
  const missingObjectIds = uniqueStrings(
    missingValues.map((row) => row.valueObjectId),
  );

  const [definitionResult, assignmentResult, objectResult] = await Promise.all([
    supabase
      .from("value_object_parameter_definitions")
      .select(
        "id,parameter_code,title,value_type_code,canonical_unit_code,allow_negative,scope_code,status",
      )
      .in("id", missingParameterIds)
      .eq("scope_code", "system")
      .eq("status", "active"),
    supabase
      .from("value_object_parameter_assignments")
      .select(
        "id,value_object_id,parameter_definition_id,scope_code,assignment_scope_code,status",
      )
      .in("parameter_definition_id", profileParameterIds)
      .in("value_object_id", profileObjectIds)
      .eq("scope_code", "system")
      .eq("assignment_scope_code", "system")
      .eq("status", "active"),
    supabase
      .from("value_objects")
      .select(
        "id,canonical_key,title,scope_code,ontology_node_role_code,status",
      )
      .in("id", missingObjectIds)
      .eq("scope_code", "global")
      .eq("ontology_node_role_code", "leaf")
      .eq("status", "active"),
  ]);

  if (definitionResult.error) {
    throw new Error(
      `E03_SUPPLEMENT_PARAMETER_DEFINITION_READ_FAILED:${definitionResult.error.message}`,
    );
  }
  if (assignmentResult.error) {
    throw new Error(
      `E03_SUPPLEMENT_PARAMETER_ASSIGNMENT_READ_FAILED:${assignmentResult.error.message}`,
    );
  }
  if (objectResult.error) {
    throw new Error(
      `E03_SUPPLEMENT_TARGET_OBJECT_READ_FAILED:${objectResult.error.message}`,
    );
  }

  const definitions = (definitionResult.data ?? []) as ParameterDefinitionRow[];
  const assignments = (assignmentResult.data ?? []) as AssignmentRow[];
  const valueObjects = (objectResult.data ?? []) as ValueObjectRow[];

  const definitionById = new Map(definitions.map((row) => [String(row.id), row]));
  const objectById = new Map(valueObjects.map((row) => [String(row.id), row]));
  const sourceBindings = readSourceBindings(
    asRecord(profile.metadata_json).sourceValueBindingsV1,
  );

  const options: E03SourceFactSupplementOption[] = [];

  for (const missing of missingValues) {
    if (
      !profileParameterIds.includes(missing.parameterDefinitionId) ||
      !profileObjectIds.includes(missing.valueObjectId)
    ) {
      throw new Error("E03_SUPPLEMENT_MISSING_PAIR_NOT_IN_PROFILE");
    }

    const definition = definitionById.get(missing.parameterDefinitionId);
    const target = objectById.get(missing.valueObjectId);
    if (!definition || !target || !text(target.canonical_key)) {
      throw new Error("E03_SUPPLEMENT_MISSING_PAIR_TARGET_INVALID");
    }
    if (definition.parameter_code !== missing.parameterCode) {
      throw new Error("E03_SUPPLEMENT_PARAMETER_CODE_CHANGED");
    }

    if (sourceBindings) {
      if (
        !sourceBindings.some(
          (binding) =>
            binding.parameterDefinitionId === missing.parameterDefinitionId &&
            binding.valueObjectId === missing.valueObjectId,
        )
      ) {
        throw new Error("E03_SUPPLEMENT_SOURCE_BINDING_MISMATCH");
      }
    } else {
      const routes = assignments.filter(
        (assignment) =>
          assignment.parameter_definition_id ===
          missing.parameterDefinitionId,
      );
      if (
        routes.length !== 1 ||
        routes[0].value_object_id !== missing.valueObjectId
      ) {
        throw new Error("E03_SUPPLEMENT_FALLBACK_ROUTE_NOT_UNIQUE");
      }
    }

    const pairAssignments = assignments.filter(
      (assignment) =>
        assignment.parameter_definition_id === missing.parameterDefinitionId &&
        assignment.value_object_id === missing.valueObjectId,
    );
    if (pairAssignments.length !== 1) {
      throw new Error("E03_SUPPLEMENT_SYSTEM_ASSIGNMENT_NOT_UNIQUE");
    }

    options.push({
      ...missing,
      parameterTitle: definition.title,
      targetTitle: target.title,
      valueTypeCode: definition.value_type_code,
      canonicalUnitCode: definition.canonical_unit_code,
      allowNegative: definition.allow_negative === true,
    });
  }

  return {
    signalData,
    normalizedPreview,
    analysis,
    materialization,
    priorFactsWritten,
    templateId,
    profile,
    activity,
    actorId,
    options,
    assignments,
    objectById,
  };
}

export async function supplementMissingBasicIntakeSourceFactE03V1(input: {
  appUserId: string;
  activityEventId: string;
  parameterDefinitionId: string;
  valueObjectId: string;
  rawValue: string;
}): Promise<E03SourceFactSupplementResult> {
  if (
    !UUID_RE.test(input.appUserId) ||
    !UUID_RE.test(input.activityEventId) ||
    !UUID_RE.test(input.parameterDefinitionId) ||
    !UUID_RE.test(input.valueObjectId)
  ) {
    throw new Error("E03_SUPPLEMENT_INPUT_INVALID");
  }

  const context = await readContext({
    appUserId: input.appUserId,
    activityEventId: input.activityEventId,
  });

  const option = context.options.find(
    (row) =>
      row.parameterDefinitionId === input.parameterDefinitionId &&
      row.valueObjectId === input.valueObjectId,
  );
  if (!option) {
    throw new Error("E03_SUPPLEMENT_PAIR_NOT_CURRENTLY_MISSING");
  }

  const parsed = parseManualValue(option, input.rawValue);
  const target = context.objectById.get(option.valueObjectId);
  const assignment = context.assignments.find(
    (row) =>
      row.parameter_definition_id === option.parameterDefinitionId &&
      row.value_object_id === option.valueObjectId,
  );

  if (!target || !assignment) {
    throw new Error("E03_SUPPLEMENT_ROUTE_DISAPPEARED");
  }

  const now = new Date().toISOString();
  const rawFragment = input.rawValue.trim();
  const temporalDirection =
    text(context.analysis.temporalDirection) ||
    (context.activity.activity_role_code === "planned" ? "future" : "past");

  const writerRow: WriterRow = {
    canonicalKey: target.canonical_key,
    parameterCode: option.parameterCode,
    unit: parsed.unit,
    rawFragment,
    normalizedFragment: rawFragment.replace(/\s+/gu, " ").trim(),
    semanticMatchMethodCode: "user_confirmed",
    sourceType: "ai_extraction",
    confidence: 1,
    factStatus: temporalDirection === "future" ? "proposed" : "confirmed",
    isUserConfirmed: temporalDirection !== "future",
    valueOriginCode: "user_explicit",
    sourceReliabilityCode: "user_reported",
    sourceSnapshotJson: {
      contract: ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1,
      parentContract: ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1,
      captureMethod: "manual_missing_bundle_value",
      storageSourceTypeCompatibility: "ai_extraction",
      supplementedAt: now,
      rawSignalId: String(context.signalData.id),
      activityEventId: input.activityEventId,
      templateId: context.templateId,
      profileId: context.profile.id,
      profileVersionNo: context.profile.version_no,
      parameterDefinitionId: option.parameterDefinitionId,
      parameterAssignmentId: assignment.id,
      targetValueObjectId: option.valueObjectId,
      originalMissingReasonCode: option.reasonCode,
      canonicalUnitCode: option.canonicalUnitCode,
      valueTypeCode: option.valueTypeCode,
      routingResolution: "declared_missing_bundle_pair_user_supplement_v1",
    },
  };

  if (parsed.valueNumeric !== undefined) {
    writerRow.valueNumeric = parsed.valueNumeric;
  } else if (parsed.valueText !== undefined) {
    writerRow.valueText = parsed.valueText;
  } else {
    throw new Error("E03_SUPPLEMENT_NORMALIZED_VALUE_MISSING");
  }

  const requestHash = sha256({
    contract: ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1,
    activityEventId: input.activityEventId,
    templateId: context.templateId,
    profileId: context.profile.id,
    profileVersionNo: context.profile.version_no,
    parameterDefinitionId: option.parameterDefinitionId,
    valueObjectId: option.valueObjectId,
    writerRow,
  });
  const idempotencyKey =
    `${ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1}:` +
    `${input.activityEventId}:${option.parameterDefinitionId}:${option.valueObjectId}`;

  const { data: writerResult, error: writerError } = await supabase.rpc(
    "attach_global_observation_facts_gsr1_v1",
    {
      p_owner_user_id: input.appUserId,
      p_owner_actor_id: context.actorId,
      p_activity_event_id: input.activityEventId,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_facts: [writerRow],
    },
  );

  if (writerError) {
    throw new Error(`E03_SUPPLEMENT_GLOBAL_FACT_WRITER_FAILED:${writerError.message}`);
  }

  const writer = writerRowsFromResult(writerResult);
  if (writer.factIds.length !== 1) {
    throw new Error("E03_SUPPLEMENT_WRITER_RESULT_INVALID");
  }

  const remainingOptions = context.options.filter(
    (row) =>
      !(
        row.parameterDefinitionId === option.parameterDefinitionId &&
        row.valueObjectId === option.valueObjectId
      ),
  );

  const previousFactIds = uniqueStrings(
    Array.isArray(context.materialization.factIds)
      ? context.materialization.factIds
      : [],
  );
  const previousMeasureIds = uniqueStrings(
    Array.isArray(context.materialization.measureIds)
      ? context.materialization.measureIds
      : [],
  );
  const factIds = uniqueStrings([...previousFactIds, ...writer.factIds]);
  const measureIds = uniqueStrings([...previousMeasureIds, ...writer.measureIds]);
  const addedFactCount = factIds.length > previousFactIds.length ? 1 : 0;
  const factsWritten = Math.max(
    context.priorFactsWritten + addedFactCount,
    factIds.length,
  );

  const previousWriterRows = Array.isArray(context.materialization.sourceWriterRows)
    ? context.materialization.sourceWriterRows.map(asRecord)
    : [];
  const sourceWriterRows = previousWriterRows.filter((row) => {
    const snapshot = asRecord(row.sourceSnapshotJson);
    return !(
      text(snapshot.parameterDefinitionId) === option.parameterDefinitionId &&
      text(snapshot.targetValueObjectId) === option.valueObjectId
    );
  });
  sourceWriterRows.push(writerRow);

  const previousSupplement = asRecord(
    context.materialization.sourceFactSupplementV1,
  );
  const previousEntries = Array.isArray(previousSupplement.entries)
    ? previousSupplement.entries.map(asRecord)
    : [];
  const entries = previousEntries.filter(
    (entry) =>
      !(
        text(entry.parameterDefinitionId) === option.parameterDefinitionId &&
        text(entry.valueObjectId) === option.valueObjectId
      ),
  );
  entries.push({
    supplementedAt: now,
    parameterDefinitionId: option.parameterDefinitionId,
    parameterCode: option.parameterCode,
    valueObjectId: option.valueObjectId,
    canonicalUnitCode: option.canonicalUnitCode,
    valueTypeCode: option.valueTypeCode,
    rawValue: rawFragment,
    factId: writer.factIds[0],
    measureId: writer.measureIds[0] ?? null,
    writerStatus: writer.status,
  });

  const completeness: "complete" | "partial" =
    remainingOptions.length === 0 ? "complete" : "partial";

  const nextMaterialization = {
    ...context.materialization,
    status: "materialized",
    materializedAt: now,
    factsWritten,
    factIds,
    measureIds,
    sourceWriterRows,
    missingValues: remainingOptions,
    completeness,
    sourceFactSupplementV1: {
      contract: ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1,
      updatedAt: now,
      entries,
    },
  };

  const nextAnalysis: JsonRecord = {
    ...context.analysis,
    factsWritten,
    sourceFactMaterializationV1: nextMaterialization,
  };

  const { error: signalUpdateError } = await supabase
    .from("raw_activity_signals")
    .update({
      normalized_preview_json: {
        ...context.normalizedPreview,
        basicIntakeAnalysisV1: nextAnalysis,
      },
      updated_at: now,
    })
    .eq("id", context.signalData.id)
    .eq("user_id", input.appUserId);

  if (signalUpdateError) {
    throw new Error(
      `E03_SUPPLEMENT_SIGNAL_RESULT_UPDATE_FAILED:${signalUpdateError.message}`,
    );
  }

  return {
    contract: ARCTOR_E03_SOURCE_FACT_SUPPLEMENT_V1,
    activityEventId: input.activityEventId,
    parameterDefinitionId: option.parameterDefinitionId,
    valueObjectId: option.valueObjectId,
    factsWritten,
    factIds,
    measureIds,
    completeness,
    missingValues: remainingOptions,
    analysis: nextAnalysis,
    writerResult,
  };
}
