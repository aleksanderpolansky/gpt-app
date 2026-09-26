import {
  parseSourceResolution,
  parseSourceTargetQualification,
  validateSourceBindingTargetQualifications,
  type SourceBinding,
  type SourceTargetQualification,
} from "./source-snapshot-resolution";
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
  qualifier: string | null;
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

export type E03MissingBundleValue = {
  parameterDefinitionId: string;
  parameterCode: string;
  valueObjectId: string;
  reasonCode: "EXPLICIT_VALUE_MISSING" | "SNAPSHOT_VALUE_MISSING";
  valueTypeCode?: string;
  canonicalUnitCode?: string | null;
  targetTitle?: string;
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
  missingValues: E03MissingBundleValue[];
  completeness: "complete" | "partial";
  writerResult: unknown;
};

export type E03SourceFactPreflightResult = {
  contract: typeof ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1;
  status: "eligible" | "blocked";
  eligible: boolean;
  activityEventId: string;
  rawSignalId: string;
  templateId: string;
  profileId: string;
  profileVersionNo: number;
  factsPlanned: number;
  ignoredParameterCodes: string[];
  missingValues: E03MissingBundleValue[];
  completeness: "complete" | "partial" | "missing_all";
  reasonCode?: "E03_REQUIRED_BUNDLE_VALUES_MISSING";
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

function normalizeQualifierText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] +
          Number(left[leftIndex - 1] !== right[rightIndex - 1]),
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function tokenEquivalent(left: string, right: string): boolean {
  if (left === right) return true;

  if (
    left.length >= 5 &&
    right.length >= 5 &&
    left.slice(0, 5) === right.slice(0, 5)
  ) {
    return true;
  }

  return (
    left.length >= 4 &&
    right.length >= 4 &&
    Math.abs(left.length - right.length) <= 1 &&
    levenshteinDistance(left, right) <= 1
  );
}

function trigramDice(left: string, right: string): number {
  const trigrams = (value: string) => {
    const padded = `  ${value}  `;
    const result = new Set<string>();

    for (let index = 0; index <= padded.length - 3; index += 1) {
      result.add(padded.slice(index, index + 3));
    }

    return result;
  };

  const a = trigrams(left);
  const b = trigrams(right);
  if (a.size === 0 || b.size === 0) return 0;

  let overlap = 0;
  for (const item of a) {
    if (b.has(item)) overlap += 1;
  }

  return (2 * overlap) / (a.size + b.size);
}

function qualifierSimilarity(
  qualifier: string,
  alias: string,
): number {
  const left = normalizeQualifierText(qualifier);
  const right = normalizeQualifierText(alias);

  if (!left || !right) return 0;
  if (
    left === right ||
    left.includes(right) ||
    right.includes(left)
  ) {
    return 1;
  }

  const leftTokens = left.split(" ").filter(Boolean);
  const rightTokens = right.split(" ").filter(Boolean);

  let matched = 0;
  let hasLongMatch = false;

  for (const leftToken of leftTokens) {
    const rightToken = rightTokens.find(
      (candidate) =>
        tokenEquivalent(leftToken, candidate),
    );

    if (rightToken) {
      matched += 1;
      if (
        leftToken.length >= 5 ||
        rightToken.length >= 5
      ) {
        hasLongMatch = true;
      }
    }
  }

  const tokenScore =
    matched /
    Math.max(
      leftTokens.length,
      rightTokens.length,
      1,
    );

  const shortPhraseBoost =
    hasLongMatch &&
    leftTokens.length <= 2 &&
    rightTokens.length <= 2
      ? 0.65
      : 0;

  return Math.max(
    tokenScore,
    shortPhraseBoost,
    trigramDice(left, right),
  );
}

function qualificationScore(
  measurement: Measurement,
  qualification: SourceTargetQualification | undefined,
): number {
  if (
    !measurement.qualifier ||
    !qualification ||
    qualification.aliases.length === 0
  ) {
    return 0;
  }

  return Math.max(
    ...qualification.aliases.map(
      (alias) =>
        qualifierSimilarity(
          measurement.qualifier ?? "",
          alias,
        ),
    ),
  );
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
    const qualifier =
      row.qualifier === null ||
      row.qualifier === undefined
        ? null
        : text(row.qualifier) ||
          null;
    const confidence = finiteNumber(row.confidence);
    const exactValueCount = Number(valueNumeric !== null) + Number(valueText !== null);

    if (
      !/^[a-z][a-z0-9_]{0,79}$/.test(parameterCode) ||
      !/^[a-z][a-z0-9_]{0,39}$/.test(unit) ||
      !rawFragment ||
      (
        qualifier !== null &&
        !rawFragment
          .toLocaleLowerCase()
          .includes(
            qualifier
              .toLocaleLowerCase(),
          )
      ) ||
      exactValueCount !== 1 ||
      confidence === null ||
      confidence < 0 ||
      confidence > 1
    ) {
      continue;
    }

    const key = [
      parameterCode,
      unit,
      valueNumeric ?? valueText ?? "",
      qualifier ?? "",
      normalizeQualifierText(
        rawFragment,
      ),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    output.push({
      parameterCode,
      unit,
      valueNumeric,
      valueText,
      qualifier,
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
  const makeMissingBundleValue = (
    definition: ParameterDefinitionRow,
    valueObjectId: string,
    reasonCode: E03MissingBundleValue["reasonCode"],
  ): E03MissingBundleValue => {
    const target = objectById.get(valueObjectId);
    if (!target) {
      throw new Error(`E03_TARGET_OBJECT_INVALID:${definition.parameter_code}`);
    }
    return {
      parameterDefinitionId: definition.id,
      parameterCode: definition.parameter_code,
      valueObjectId,
      reasonCode,
      valueTypeCode: definition.value_type_code,
      canonicalUnitCode: definition.canonical_unit_code,
      targetTitle: target.title,
    };
  };
  const writerRows: WriterRow[] = [];
  const ignoredParameterCodes: string[] = [];
  const missingValues: E03MissingBundleValue[] = [];
  const temporalDirection = text(analysis.temporalDirection) ||
    (activityData.activity_role_code === "planned" ? "future" : "past");

  const bindingValue = asRecord(profile.metadata_json).sourceValueBindingsV1;
  const bindings: SourceBinding[] | null = Array.isArray(bindingValue) ? bindingValue.map((value) => {
    const row = asRecord(value);
    const binding: SourceBinding = {
      parameterDefinitionId:
        text(
          row.parameterDefinitionId,
        ),
      valueObjectId:
        text(
          row.valueObjectId,
        ),
      sourceResolution:
        parseSourceResolution(
          row.sourceResolution,
        ),
      targetQualification:
        parseSourceTargetQualification(
          row.targetQualification,
        ),
    };
    if (!definitions.some((item) => item.id === binding.parameterDefinitionId) ||
        !assignments.some((item) => item.parameter_definition_id === binding.parameterDefinitionId && item.value_object_id === binding.valueObjectId)) {
      throw new Error("SOURCE_BINDING_PROFILE_MISMATCH");
    }
    return binding;
  }) : null;
  if (bindings && (!bindings.length || new Set(bindings.map((row) => `${row.parameterDefinitionId}|${row.valueObjectId}`)).size !== bindings.length)) {
    throw new Error("SOURCE_BINDING_PROFILE_INVALID");
  }

  if (bindings) {
    validateSourceBindingTargetQualifications(
      bindings,
    );
  }

  const declaredPairs = bindings
    ? bindings.map((binding) => ({
        parameterDefinitionId: binding.parameterDefinitionId,
        valueObjectId: binding.valueObjectId,
        sourceResolution: binding.sourceResolution,
        targetQualification:
          binding.targetQualification,
      }))
    : definitions.map((definition) => {
        const matchingAssignments = assignments.filter((assignment) => assignment.parameter_definition_id === definition.id);
        if (matchingAssignments.length === 0) throw new Error(`E03_PROFILE_ROUTE_MISSING:${definition.parameter_code}`);
        if (matchingAssignments.length !== 1) throw new Error(`E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER:${definition.parameter_code}`);
        return {
          parameterDefinitionId:
            definition.id,
          valueObjectId:
            matchingAssignments[0]
              .value_object_id,
          sourceResolution:
            null,
          targetQualification:
            undefined,
        };
      });

  const inputFingerprint = sha256({ measurements, profileId: profile.id, bindings, sourceText, actorId,
    startedAt: activityData.started_at, temporalDirection });
  const previous = asRecord(analysis.sourceFactMaterializationV1);
  const cachedRows = previous.inputFingerprint === inputFingerprint && Array.isArray(previous.sourceWriterRows)
    ? previous.sourceWriterRows as WriterRow[] : null;

  if (cachedRows) {
    writerRows.push(...cachedRows);
    const fulfilledPairs = new Set(cachedRows.map((row) => {
      const snapshot = asRecord(row.sourceSnapshotJson);
      return `${text(snapshot.parameterDefinitionId)}|${text(snapshot.targetValueObjectId)}`;
    }));
    for (const pair of declaredPairs) {
      const key = `${pair.parameterDefinitionId}|${pair.valueObjectId}`;
      if (fulfilledPairs.has(key)) continue;
      const definition = definitions.find((row) => row.id === pair.parameterDefinitionId);
      if (!definition) throw new Error("SOURCE_BINDING_PROFILE_MISMATCH");
      missingValues.push(
        makeMissingBundleValue(
          definition,
          pair.valueObjectId,
          pair.sourceResolution
            ? "SNAPSHOT_VALUE_MISSING"
            : "EXPLICIT_VALUE_MISSING",
        ),
      );
    }
  } else {
    const plans: {
      measurement: Measurement;
      targetId: string;
      provenance?: JsonRecord;
      targetQualification?: SourceTargetQualification;
    }[] = [];

    if (bindings) {
      await validateSnapshotBindings(
        bindings,
      );
    }

    const planSnapshotFallback =
      async (
        pair:
          typeof declaredPairs[number],
        definition:
          ParameterDefinitionRow,
      ) => {
        const resolution =
          pair.sourceResolution;

        if (!resolution) {
          missingValues.push(
            makeMissingBundleValue(
              definition,
              pair.valueObjectId,
              "EXPLICIT_VALUE_MISSING",
            ),
          );
          return;
        }

        try {
          const resolved =
            await resolveSnapshotValue({
              appUserId:
                input.appUserId,
              actorId,
              effectiveAt:
                text(
                  activityData.started_at,
                ),
              parameterDefinitionId:
                pair.parameterDefinitionId,
              resolution,
            });

          plans.push({
            targetId:
              pair.valueObjectId,
            targetQualification:
              pair.targetQualification,
            provenance:
              resolved.provenance,
            measurement: {
              parameterCode:
                definition.parameter_code,
              unit:
                resolved.unit,
              valueNumeric:
                resolved.value,
              valueText:
                null,
              qualifier:
                null,
              rawFragment:
                sourceText,
              confidence:
                Math.min(
                  resolved.confidence,
                  candidate.confidence,
                ),
              approximate:
                false,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error);

          if (
            message.startsWith(
              "SOURCE_SNAPSHOT_NOT_FOUND",
            ) ||
            message.startsWith(
              "SOURCE_SNAPSHOT_EXPIRED",
            )
          ) {
            missingValues.push(
              makeMissingBundleValue(
                definition,
                pair.valueObjectId,
                "SNAPSHOT_VALUE_MISSING",
              ),
            );
            return;
          }

          throw error;
        }
      };

    for (const definition of definitions) {
      const pairs =
        declaredPairs.filter(
          (pair) =>
            pair.parameterDefinitionId ===
            definition.id,
        );

      if (pairs.length === 0) {
        continue;
      }

      const explicit =
        measurements.filter(
          (row) =>
            row.parameterCode ===
            definition.parameter_code,
        );

      const qualificationEnabled =
        pairs.some(
          (pair) =>
            pair.targetQualification !==
            undefined,
        );

      if (!qualificationEnabled) {
        // Backward compatibility: profiles authored before target
        // qualification keep the historical fan-out behavior.
        for (const pair of pairs) {
          const resolution =
            pair.sourceResolution;

          if (
            resolution?.mode !==
              "snapshot_only" &&
            explicit.length > 1
          ) {
            throw new Error(
              `SOURCE_EXPLICIT_VALUE_AMBIGUOUS:${definition.parameter_code}`,
            );
          }

          if (
            resolution?.mode !==
              "snapshot_only" &&
            explicit.length === 1
          ) {
            plans.push({
              measurement:
                explicit[0],
              targetId:
                pair.valueObjectId,
            });
            continue;
          }

          await planSnapshotFallback(
            pair,
            definition,
          );
        }

        continue;
      }

      const assignedPairKeys =
        new Set<string>();

      const usedMeasurementIndexes =
        new Set<number>();

      const directEligiblePairs =
        pairs.filter(
          (pair) =>
            pair
              .sourceResolution
              ?.mode !==
            "snapshot_only",
        );

      for (
        let index = 0;
        index < explicit.length;
        index += 1
      ) {
        const measurement =
          explicit[index];

        if (!measurement.qualifier) {
          continue;
        }

        const ranked =
          directEligiblePairs
            .map(
              (pair) => ({
                pair,
                score:
                  qualificationScore(
                    measurement,
                    pair
                      .targetQualification,
                  ),
              }),
            )
            .filter(
              (item) =>
                item.score >=
                0.58,
            )
            .sort(
              (left, right) =>
                right.score -
                left.score,
            );

        if (ranked.length === 0) {
          continue;
        }

        if (
          ranked.length > 1 &&
          Math.abs(
            ranked[0].score -
              ranked[1].score,
          ) <
            0.08
        ) {
          throw new Error(
            `SOURCE_EXPLICIT_QUALIFIER_AMBIGUOUS:${definition.parameter_code}`,
          );
        }

        const pair =
          ranked[0].pair;

        const pairKey =
          `${pair.parameterDefinitionId}|${pair.valueObjectId}`;

        if (
          assignedPairKeys.has(
            pairKey,
          )
        ) {
          throw new Error(
            `SOURCE_EXPLICIT_TARGET_MULTIPLE_VALUES:${definition.parameter_code}:${pair.valueObjectId}`,
          );
        }

        assignedPairKeys.add(
          pairKey,
        );
        usedMeasurementIndexes.add(
          index,
        );

        plans.push({
          measurement,
          targetId:
            pair.valueObjectId,
          targetQualification:
            pair.targetQualification,
        });
      }

      const defaultPair =
        directEligiblePairs.find(
          (pair) =>
            pair
              .targetQualification
              ?.mode ===
            "default",
        );

      const unqualifiedIndexes =
        explicit
          .map(
            (
              measurement,
              index,
            ) => ({
              measurement,
              index,
            }),
          )
          .filter(
            ({ measurement, index }) =>
              !usedMeasurementIndexes.has(
                index,
              ) &&
              measurement.qualifier ===
                null,
          )
          .map(
            ({ index }) =>
              index,
          );

      if (
        defaultPair &&
        unqualifiedIndexes.length >
          1
      ) {
        throw new Error(
          `SOURCE_UNQUALIFIED_VALUE_AMBIGUOUS:${definition.parameter_code}`,
        );
      }

      if (
        defaultPair &&
        unqualifiedIndexes.length ===
          1
      ) {
        const pairKey =
          `${defaultPair.parameterDefinitionId}|${defaultPair.valueObjectId}`;

        if (
          !assignedPairKeys.has(
            pairKey,
          )
        ) {
          const index =
            unqualifiedIndexes[0];

          assignedPairKeys.add(
            pairKey,
          );
          usedMeasurementIndexes.add(
            index,
          );

          plans.push({
            measurement:
              explicit[index],
            targetId:
              defaultPair
                .valueObjectId,
            targetQualification:
              defaultPair
                .targetQualification,
          });
        }
      }

      for (const pair of pairs) {
        const pairKey =
          `${pair.parameterDefinitionId}|${pair.valueObjectId}`;

        if (
          assignedPairKeys.has(
            pairKey,
          )
        ) {
          continue;
        }

        await planSnapshotFallback(
          pair,
          definition,
        );
      }
    }

    ignoredParameterCodes.push(...measurements.filter((row) => !definitionByCode.has(row.parameterCode)).map((row) => row.parameterCode));

    for (const plan of plans) {
      const { measurement } = plan;
      const matchingDefinitions = definitionByCode.get(measurement.parameterCode) ?? [];
      if (matchingDefinitions.length === 0) { ignoredParameterCodes.push(measurement.parameterCode); continue; }
      if (matchingDefinitions.length !== 1) throw new Error(`E03_PROFILE_PARAMETER_CODE_AMBIGUOUS:${measurement.parameterCode}`);
      const definition = matchingDefinitions[0];
      const matchingAssignments = assignments.filter((assignment) => assignment.parameter_definition_id === definition.id && assignment.value_object_id === plan.targetId);
      if (matchingAssignments.length === 0) throw new Error(`E03_PROFILE_ROUTE_MISSING:${measurement.parameterCode}`);
      if (matchingAssignments.length !== 1) throw new Error(`E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER:${measurement.parameterCode}`);
      const assignment = matchingAssignments[0];
      const target = objectById.get(assignment.value_object_id);
      if (!target || !text(target.canonical_key)) throw new Error(`E03_TARGET_OBJECT_INVALID:${measurement.parameterCode}`);

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
          measurementQualifier:
            measurement.qualifier,
          targetQualification:
            plan.targetQualification ??
            null,
          approximate: measurement.approximate,
          routingResolution: plan.targetQualification
            ? "qualified_target_binding_v1"
            : "unique_system_assignment_within_active_profile_v1",
        },
      };
      if (measurement.valueNumeric !== null) row.valueNumeric = measurement.valueNumeric;
      else if (measurement.valueText !== null) row.valueText = measurement.valueText;
      else throw new Error(`E03_MEASUREMENT_VALUE_MISSING:${measurement.parameterCode}`);
      writerRows.push(row);
    }
  }

  const uniqueIgnoredParameterCodes = Array.from(new Set(ignoredParameterCodes));
  const completeness = missingValues.length === 0 ? "complete" : writerRows.length === 0 ? "missing_all" : "partial";

  if (input.preflightOnly && writerRows.length === 0) {
    return {
      contract: ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1,
      status: "blocked",
      eligible: false,
      activityEventId: input.activityEventId,
      rawSignalId: String(signalData.id),
      templateId: candidate.templateId,
      profileId: profile.id,
      profileVersionNo: profile.version_no,
      factsPlanned: 0,
      ignoredParameterCodes: uniqueIgnoredParameterCodes,
      missingValues,
      completeness: "missing_all",
      reasonCode: "E03_REQUIRED_BUNDLE_VALUES_MISSING",
    };
  }

  if (writerRows.length === 0) {
    const diagnosedAt = new Date().toISOString();
    const nextAnalysis = {
      ...analysis,
      sourceFactMaterializationV1: {
        contract: ARCTOR_E03_SOURCE_FACT_MATERIALIZATION_V1,
        status: "blocked_missing_values",
        diagnosedAt,
        inputFingerprint,
        rawSignalId: String(signalData.id),
        activityEventId: input.activityEventId,
        templateId: candidate.templateId,
        profileId: profile.id,
        profileVersionNo: profile.version_no,
        factsWritten: 0,
        ignoredParameterCodes: uniqueIgnoredParameterCodes,
        missingValues,
        completeness: "missing_all",
      },
    };
    const { error: signalUpdateError } = await supabase
      .from("raw_activity_signals")
      .update({ normalized_preview_json: { ...normalizedPreview, basicIntakeAnalysisV1: nextAnalysis }, updated_at: diagnosedAt })
      .eq("id", signalData.id)
      .eq("user_id", input.appUserId);
    if (signalUpdateError) throw new Error(`E03_SIGNAL_RESULT_UPDATE_FAILED:${signalUpdateError.message}`);
    throw new Error("E03_REQUIRED_BUNDLE_VALUES_MISSING");
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
      ignoredParameterCodes: uniqueIgnoredParameterCodes,
      missingValues,
      completeness: completeness === "missing_all" ? "partial" : completeness,
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
      ignoredParameterCodes: uniqueIgnoredParameterCodes,
      missingValues,
      completeness: completeness === "complete" ? "complete" : "partial",
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
    ignoredParameterCodes: uniqueIgnoredParameterCodes,
    missingValues,
    completeness: completeness === "complete" ? "complete" : "partial",
    writerResult,
  };
}
