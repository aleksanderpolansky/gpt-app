import { parseSourceResolution, type SourceBinding } from "./source-snapshot-resolution";
import { resolveSnapshotValue, validateSnapshotBindings } from "./source-snapshot-resolution.server";
import crypto from "node:crypto";

import { supabase } from "../../../lib/supabase";

export const ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1 =
  "ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1" as const;
export const ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1 =
  "ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1" as const;

const BASIC_ANALYSIS_CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1";
const REJECTION_CONTRACT = "ARCTOR_USER_TYPICAL_ACTIVITY_REJECTION_V1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FACTS = 20;

type JsonRecord = Record<string, unknown>;

type Measurement = {
  parameterCode: string;
  unit: string;
  valueNumeric: number | null;
  valueText: string | null;
  rawFragment: string;
  confidence: number;
  approximate: boolean;
};

type TemplateCandidate = {
  templateId: string;
  confidence: number;
};

type ProfileRow = {
  id: string;
  template_id: string;
  version_no: number;
  routing_contract_code: string | null;
  metadata_json: unknown;
};

type ProfileParameterRow = {
  parameter_definition_id: string;
};

type ParameterDefinitionRow = {
  id: string;
  parameter_code: string;
  value_type_code: string;
  canonical_unit_code: string | null;
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

type WriterRow = {
  canonicalKey: string;
  parameterCode: string;
  unit: string;
  valueNumeric?: number;
  valueText?: string;
  rawFragment: string;
  normalizedFragment: string;
  semanticMatchMethodCode: "user_confirmed";
  sourceType: "ai_extraction" | "derived_calculation";
  confidence: number;
  factStatus: "confirmed" | "proposed";
  isUserConfirmed: boolean;
  valueOriginCode: "user_explicit" | "deterministic_calculation";
  sourceReliabilityCode: "user_reported" | "deterministic";
  sourceSnapshotJson: JsonRecord;
};

export type E03SourceFactMaterializationResult = {
  contract: typeof ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1;
  status: "materialized" | "idempotent_replay";
  activityEventId: string;
  rawSignalId: string;
  templateId: string;
  profileId: string;
  profileVersionNo: number;
  factsWritten: number;
  factIds: string[];
  measureIds: string[];
  ignoredParameterCodes: string[];
  writerResult: unknown;
};

export type E03SourceFactPreflightResult = {
  contract: typeof ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1;
  status: "eligible";
  eligible: true;
  activityEventId: string;
  rawSignalId: string;
  templateId: string;
  profileId: string;
  profileVersionNo: number;
  factsPlanned: number;
  ignoredParameterCodes: string[];
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

function normalizeFragment(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function readMeasurements(value: unknown): Measurement[] {
  if (!Array.isArray(value) || value.length > MAX_FACTS) return [];

  const output: Measurement[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const row = asRecord(item);
    const parameterCode = text(row.parameterCode).toLowerCase();
    const unit = text(row.unit).toLowerCase();
    const rawFragment = text(row.rawFragment);
    const valueNumeric = finiteNumber(row.valueNumeric);
    const valueText = row.valueText === null ? null : text(row.valueText) || null;
    const confidence = finiteNumber(row.confidence);
    const exactValueCount = Number(valueNumeric !== null) + Number(valueText !== null);

    if (
      !/^[a-z][a-z0-9_]{0,79}$/.test(parameterCode) ||
      !/^[a-z][a-z0-9_]{0,39}$/.test(unit) ||
      !rawFragment ||
      exactValueCount !== 1 ||
      confidence === null ||
      confidence < 0 ||
      confidence > 1
    ) {
      continue;
    }

    const key = `${parameterCode}|${unit}|${valueNumeric ?? valueText ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    output.push({
      parameterCode,
      unit,
      valueNumeric,
      valueText,
      rawFragment,
      confidence,
      approximate: row.approximate === true,
    });
  }

  return output;
}

function readSingleTemplateCandidate(value: unknown): TemplateCandidate | null {
  if (!Array.isArray(value) || value.length !== 1) return null;

  const row = asRecord(value[0]);
  const templateId = text(row.templateId);
  const confidence = finiteNumber(row.confidence);

  if (!UUID_RE.test(templateId) || confidence === null || confidence < 0.9 || confidence > 1) {
    return null;
  }

  return { templateId, confidence };
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

export async function materializeBasicIntakeSourceFactsE03V1(input: {
  appUserId: string;
  activityEventId: string;
  preflightOnly: true;
}): Promise<E03SourceFactPreflightResult>;
export async function materializeBasicIntakeSourceFactsE03V1(input: {
  appUserId: string;
  activityEventId: string;
  preflightOnly?: false;
}): Promise<E03SourceFactMaterializationResult>;
export async function materializeBasicIntakeSourceFactsE03V1(input: {
  appUserId: string;
  activityEventId: string;
  preflightOnly?: boolean;
}): Promise<E03SourceFactMaterializationResult | E03SourceFactPreflightResult> {
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
    throw new Error(`E03_SIGNAL_READ_FAILED:${signalError.message}`);
  }
  if (!signalData) {
    throw new Error("E03_SIGNAL_NOT_FOUND");
  }

  const normalizedPreview = asRecord(signalData.normalized_preview_json);
  const analysis = asRecord(normalizedPreview.basicIntakeAnalysisV1);
  const rejection = asRecord(analysis.userTypicalActivityRejectionV1);

  if (
    analysis.contract !== BASIC_ANALYSIS_CONTRACT ||
    analysis.status !== "completed" ||
    text(analysis.activityEventId) !== input.activityEventId ||
    analysis.typicalActivitySearchStatus !== "completed"
  ) {
    throw new Error("E03_COMPLETED_BASIC_ANALYSIS_REQUIRED");
  }

  if (text(rejection.contract) === REJECTION_CONTRACT) {
    throw new Error("E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE");
  }

  const candidate = readSingleTemplateCandidate(analysis.templateCandidates);
  if (!candidate) {
    throw new Error("E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED");
  }

  const measurements = readMeasurements(analysis.measurements);

  const { data: activityData, error: activityError } = await supabase
    .from("activity_events")
    .select("id,user_id,acting_as_actor_id,input_text,started_at,ended_at,activity_role_code")
    .eq("id", input.activityEventId)
    .eq("user_id", input.appUserId)
    .maybeSingle();

  if (activityError) {
    throw new Error(`E03_ACTIVITY_READ_FAILED:${activityError.message}`);
  }
  if (!activityData) {
    throw new Error("E03_ACTIVITY_NOT_FOUND");
  }

  const actorId = text(activityData.acting_as_actor_id);
  const sourceText = text(activityData.input_text);
  if (!UUID_RE.test(actorId) || !sourceText) {
    throw new Error("E03_ACTIVITY_ACTOR_OR_SOURCE_TEXT_MISSING");
  }

  for (const measurement of measurements) {
    if (!sourceText.toLocaleLowerCase().includes(measurement.rawFragment.toLocaleLowerCase())) {
      throw new Error(`E03_EVIDENCE_FRAGMENT_NOT_IN_SOURCE:${measurement.parameterCode}`);
    }
  }

  const { data: profileData, error: profileError } = await supabase
    .from("activity_template_impact_profiles_v1")
    .select("id,template_id,version_no,routing_contract_code,metadata_json")
    .eq("template_id", candidate.templateId)
    .eq("status", "active")
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(`E03_PROFILE_READ_FAILED:${profileError.message}`);
  }

  const profile = profileData as ProfileRow | null;
  if (!profile) {
    throw new Error("E03_ACTIVE_PROFILE_NOT_FOUND");
  }
  if (profile.routing_contract_code !== "parameter_registry_v2") {
    throw new Error("E03_PROFILE_ROUTING_CONTRACT_NOT_V2");
  }

  const [parameterResult, objectLinkResult] = await Promise.all([
    supabase
      .from("activity_template_profile_parameters_v2")
      .select("parameter_definition_id")
      .eq("profile_id", profile.id),
    supabase
      .from("activity_template_profile_object_links_v1")
      .select("target_value_object_id")
      .eq("profile_id", profile.id),
  ]);

  if (parameterResult.error) {
    throw new Error(`E03_PROFILE_PARAMETER_READ_FAILED:${parameterResult.error.message}`);
  }
  if (objectLinkResult.error) {
    throw new Error(`E03_PROFILE_OBJECT_LINK_READ_FAILED:${objectLinkResult.error.message}`);
  }

  const profileParameterIds = Array.from(
    new Set(
      ((parameterResult.data ?? []) as ProfileParameterRow[])
        .map((row) => text(row.parameter_definition_id))
        .filter((id) => UUID_RE.test(id)),
    ),
  );
  const targetObjectIds = Array.from(
    new Set(
      (objectLinkResult.data ?? [])
        .map((row) => text(row.target_value_object_id))
        .filter((id) => UUID_RE.test(id)),
    ),
  );

  if (profileParameterIds.length === 0 || targetObjectIds.length === 0) {
    throw new Error("E03_PROFILE_MAPPING_FOUNDATION_EMPTY");
  }

  const [definitionResult, assignmentResult, objectResult] = await Promise.all([
    supabase
      .from("value_object_parameter_definitions")
      .select("id,parameter_code,value_type_code,canonical_unit_code,scope_code,status")
      .in("id", profileParameterIds)
      .eq("scope_code", "system")
      .eq("status", "active"),
    supabase
      .from("value_object_parameter_assignments")
      .select("id,value_object_id,parameter_definition_id,scope_code,assignment_scope_code,status")
      .in("parameter_definition_id", profileParameterIds)
      .in("value_object_id", targetObjectIds)
      .eq("scope_code", "system")
      .eq("assignment_scope_code", "system")
      .eq("status", "active"),
    supabase
      .from("value_objects")
      .select("id,canonical_key,title,scope_code,ontology_node_role_code,status")
      .in("id", targetObjectIds)
      .eq("scope_code", "global")
      .eq("ontology_node_role_code", "leaf")
      .eq("status", "active"),
  ]);

  if (definitionResult.error) {
    throw new Error(`E03_PARAMETER_DEFINITION_READ_FAILED:${definitionResult.error.message}`);
  }
  if (assignmentResult.error) {
    throw new Error(`E03_PARAMETER_ASSIGNMENT_READ_FAILED:${assignmentResult.error.message}`);
  }
  if (objectResult.error) {
    throw new Error(`E03_TARGET_OBJECT_READ_FAILED:${objectResult.error.message}`);
  }

  const definitions = (definitionResult.data ?? []) as ParameterDefinitionRow[];
  const assignments = (assignmentResult.data ?? []) as AssignmentRow[];
  const valueObjects = (objectResult.data ?? []) as ValueObjectRow[];

  const definitionByCode = new Map<string, ParameterDefinitionRow[]>();
  for (const definition of definitions) {
    const code = text(definition.parameter_code).toLowerCase();
    const rows = definitionByCode.get(code) ?? [];
    rows.push(definition);
    definitionByCode.set(code, rows);
  }

  const objectById = new Map(valueObjects.map((row) => [String(row.id), row]));
  const writerRows: WriterRow[] = [];
  const ignoredParameterCodes: string[] = [];
  const temporalDirection = text(analysis.temporalDirection) ||
    (activityData.activity_role_code === "planned" ? "future" : "past");

  const bindingValue = asRecord(profile.metadata_json).sourceValueBindingsV1;
  const bindings: SourceBinding[] | null = Array.isArray(bindingValue) ? bindingValue.map((value) => {
    const row = asRecord(value);
    const binding: SourceBinding = { parameterDefinitionId: text(row.parameterDefinitionId), valueObjectId: text(row.valueObjectId),
      sourceResolution: parseSourceResolution(row.sourceResolution) };
    if (!definitions.some((item) => item.id === binding.parameterDefinitionId) ||
        !assignments.some((item) => item.parameter_definition_id === binding.parameterDefinitionId && item.value_object_id === binding.valueObjectId)) {
      throw new Error("SOURCE_BINDING_PROFILE_MISMATCH");
    }
    return binding;
  }) : null;
  if (bindings && (!bindings.length || new Set(bindings.map((row) => `${row.parameterDefinitionId}|${row.valueObjectId}`)).size !== bindings.length)) {
    throw new Error("SOURCE_BINDING_PROFILE_INVALID");
  }
  const inputFingerprint = sha256({ measurements, profileId: profile.id, bindings, sourceText, actorId,
    startedAt: activityData.started_at, temporalDirection });
  const previous = asRecord(analysis.sourceFactMaterializationV1);
  const cachedRows = previous.inputFingerprint === inputFingerprint && Array.isArray(previous.sourceWriterRows)
    ? previous.sourceWriterRows as WriterRow[] : null;
  if (cachedRows) {
    // Replay the originally used snapshot even if a newer/backdated state was added later.
    writerRows.push(...cachedRows);
  } else {
  const plans: { measurement: Measurement; targetId?: string; provenance?: JsonRecord }[] = [];
  if (!bindings) {
    plans.push(...measurements.map((measurement) => ({ measurement })));
  } else {
    await validateSnapshotBindings(bindings);
    for (const binding of bindings) {
      const definition = definitions.find((row) => row.id === binding.parameterDefinitionId)!;
      const explicit = measurements.filter((row) => row.parameterCode === definition.parameter_code);
      const resolution = binding.sourceResolution;
      if (resolution?.mode !== "snapshot_only" && explicit.length > 1) throw new Error(`SOURCE_EXPLICIT_VALUE_AMBIGUOUS:${definition.parameter_code}`);
      if (resolution?.mode !== "snapshot_only" && explicit.length === 1) {
        plans.push({ measurement: explicit[0], targetId: binding.valueObjectId });
      } else if (resolution) {
        const resolved = await resolveSnapshotValue({ appUserId: input.appUserId, actorId,
          effectiveAt: text(activityData.started_at), parameterDefinitionId: binding.parameterDefinitionId, resolution });
        plans.push({ targetId: binding.valueObjectId, provenance: resolved.provenance,
          measurement: { parameterCode: definition.parameter_code, unit: resolved.unit, valueNumeric: resolved.value,
            valueText: null, rawFragment: sourceText, confidence: Math.min(resolved.confidence, candidate.confidence), approximate: false } });
      }
    }
    ignoredParameterCodes.push(...measurements.filter((row) => !definitionByCode.has(row.parameterCode)).map((row) => row.parameterCode));
  }
  for (const plan of plans) {
    const { measurement } = plan;
    const matchingDefinitions = definitionByCode.get(measurement.parameterCode) ?? [];

    if (matchingDefinitions.length === 0) {
      ignoredParameterCodes.push(measurement.parameterCode);
      continue;
    }
    if (matchingDefinitions.length !== 1) {
      throw new Error(`E03_PROFILE_PARAMETER_CODE_AMBIGUOUS:${measurement.parameterCode}`);
    }

    const definition = matchingDefinitions[0];
    const matchingAssignments = assignments.filter(
      (assignment) => assignment.parameter_definition_id === definition.id && (!plan.targetId || assignment.value_object_id === plan.targetId),
    );

    if (matchingAssignments.length === 0) {
      throw new Error(`E03_PROFILE_ROUTE_MISSING:${measurement.parameterCode}`);
    }
    if (matchingAssignments.length !== 1) {
      throw new Error(`E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER:${measurement.parameterCode}`);
    }

    const assignment = matchingAssignments[0];
    const target = objectById.get(assignment.value_object_id);
    if (!target || !text(target.canonical_key)) {
      throw new Error(`E03_TARGET_OBJECT_INVALID:${measurement.parameterCode}`);
    }

    const row: WriterRow = {
      canonicalKey: target.canonical_key,
      parameterCode: definition.parameter_code,
      unit: measurement.unit,
      rawFragment: measurement.rawFragment,
      normalizedFragment: normalizeFragment(measurement.rawFragment),
      semanticMatchMethodCode: "user_confirmed",
      sourceType: plan.provenance ? "derived_calculation" : "ai_extraction",
      confidence: Math.min(measurement.confidence, candidate.confidence),
      factStatus: temporalDirection === "future" ? "proposed" : "confirmed",
      isUserConfirmed: temporalDirection !== "future",
      valueOriginCode: plan.provenance ? "deterministic_calculation" : "user_explicit",
      sourceReliabilityCode: plan.provenance ? "deterministic" : "user_reported",
      sourceSnapshotJson: {
        ...(plan.provenance ? { sourceFromSnapshotV1: plan.provenance } : {}),
        contract: ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1,
        basicAnalysisContract: BASIC_ANALYSIS_CONTRACT,
        rawSignalId: String(signalData.id),
        activityEventId: input.activityEventId,
        templateId: candidate.templateId,
        profileId: profile.id,
        profileVersionNo: profile.version_no,
        parameterDefinitionId: definition.id,
        parameterAssignmentId: assignment.id,
        targetValueObjectId: target.id,
        approximate: measurement.approximate,
        routingResolution: "unique_system_assignment_within_active_profile_v1",
      },
    };

    if (measurement.valueNumeric !== null) {
      row.valueNumeric = measurement.valueNumeric;
    } else if (measurement.valueText !== null) {
      row.valueText = measurement.valueText;
    } else {
      throw new Error(`E03_MEASUREMENT_VALUE_MISSING:${measurement.parameterCode}`);
    }

    writerRows.push(row);
  }

  }

  if (writerRows.length === 0) {
    throw new Error("E03_NO_PROFILE_MAPPED_MEASUREMENTS");
  }
  if (writerRows.length > MAX_FACTS) {
    throw new Error("E03_TOO_MANY_FACTS");
  }

  if (input.preflightOnly) {
    return {
      contract: ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1,
      status: "eligible",
      eligible: true,
      activityEventId: input.activityEventId,
      rawSignalId: String(signalData.id),
      templateId: candidate.templateId,
      profileId: profile.id,
      profileVersionNo: profile.version_no,
      factsPlanned: writerRows.length,
      ignoredParameterCodes: Array.from(new Set(ignoredParameterCodes)),
    };
  }

  const requestHash = sha256({
    contract: ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1,
    activityEventId: input.activityEventId,
    templateId: candidate.templateId,
    profileId: profile.id,
    facts: writerRows,
  });
  const idempotencyKey = `${ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1}:${input.activityEventId}`;

  const { data: writerResult, error: writerError } = await supabase.rpc(
    "attach_global_observation_facts_gsr1_v1",
    {
      p_owner_user_id: input.appUserId,
      p_owner_actor_id: actorId,
      p_activity_event_id: input.activityEventId,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_facts: writerRows,
    },
  );

  if (writerError) {
    throw new Error(`E03_GLOBAL_FACT_WRITER_FAILED:${writerError.message}`);
  }

  const writer = writerRowsFromResult(writerResult);
  const factsWritten = writerRows.length;
  const materializedAt = new Date().toISOString();
  const nextAnalysis = {
    ...analysis,
    factsWritten,
    sourceFactMaterializationV1: {
      contract: ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1,
      status: writer.status === "idempotent_replay" ? "idempotent_replay" : "materialized",
      materializedAt,
      inputFingerprint,
      sourceWriterRows: writerRows,
      rawSignalId: String(signalData.id),
      activityEventId: input.activityEventId,
      templateId: candidate.templateId,
      profileId: profile.id,
      profileVersionNo: profile.version_no,
      factsWritten,
      factIds: writer.factIds,
      measureIds: writer.measureIds,
      ignoredParameterCodes: Array.from(new Set(ignoredParameterCodes)),
      precisionEvidenceStoredInProvenance: writerRows.some(
        (row) => asRecord(row.sourceSnapshotJson).approximate === true,
      ),
      automaticRuntimeEnabled: false,
      controlledConfirmationGate: true,
    },
  };

  const { error: signalUpdateError } = await supabase
    .from("raw_activity_signals")
    .update({
      normalized_preview_json: {
        ...normalizedPreview,
        basicIntakeAnalysisV1: nextAnalysis,
      },
      updated_at: materializedAt,
    })
    .eq("id", signalData.id)
    .eq("user_id", input.appUserId);

  if (signalUpdateError) {
    throw new Error(`E03_SIGNAL_RESULT_UPDATE_FAILED:${signalUpdateError.message}`);
  }

  return {
    contract: ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1,
    status: writer.status === "idempotent_replay" ? "idempotent_replay" : "materialized",
    activityEventId: input.activityEventId,
    rawSignalId: String(signalData.id),
    templateId: candidate.templateId,
    profileId: profile.id,
    profileVersionNo: profile.version_no,
    factsWritten,
    factIds: writer.factIds,
    measureIds: writer.measureIds,
    ignoredParameterCodes: Array.from(new Set(ignoredParameterCodes)),
    writerResult,
  };
}
