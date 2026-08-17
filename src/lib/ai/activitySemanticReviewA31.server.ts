import { Buffer } from "node:buffer";
import crypto from "node:crypto";

import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonUsageMetadata,
} from "../../../lib/ai/openaiClient";
import {
  completeAiAnalysisExecution,
  createAiAnalysisExecution,
  createAiContextManifest,
  failAiAnalysisExecution,
  markAiContextManifestFailed,
  markAiContextManifestProviderCompleted,
  markAiContextManifestValidated,
} from "../../../lib/ai/contextManifest";
import { supabase } from "../../../lib/supabase";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "../reality-core/global-system-value-object-localization";
import { compileRuntimeContextPackV1 } from "./runtimeContextCompiler.server";

export const AI_A3_1_SEMANTIC_REVIEW_CONTRACT =
  "ARCTOR_AI_A3_1_SEMANTIC_REVIEW_V1" as const;

const ROUTE_PATH = "/api/activity/review-analysis";
const MIN_PROPOSALS = 8;
const MAX_PROPOSALS = 12;
const MAX_MEASUREMENTS = 20;
const MAX_OUTPUT_TOKENS = 2800;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 0;
const INPUT_TOKEN_CEILING = 40_000;

const SUPPORTED_LOCALES = new Set([
  "ru",
  "en",
  "pl",
  "uk",
  "de",
  "es",
  "cs",
]);

const MEASURE_TYPES = new Set([
  "duration",
  "distance",
  "count",
  "volume",
  "mass",
  "money",
  "energy",
  "repetitions",
  "state_score",
  "state_text",
  "boolean_state",
  "role",
  "context_tag",
  "derived_metric",
  "rate",
  "pressure",
  "ratio",
  "temperature",
  "sound_level",
  "illuminance",
]);

const LENS_CODES = [
  "direct_action",
  "broader_process",
  "state",
  "entity",
  "relationship",
  "role",
  "knowledge",
  "behavior_pattern",
  "context",
  "resource_spent",
  "resource_created",
  "material_result",
  "information_result",
  "work_result",
  "learning_result",
  "physical_result",
  "emotional_result",
  "social_result",
  "relational_result",
  "reputational_result",
  "economic_result",
  "new_obligation",
  "fulfilled_obligation",
  "new_opportunity",
  "new_limitation",
  "opportunity_cost",
  "short_term_consequence",
  "medium_term_consequence",
  "long_term_consequence",
  "future_use_possibility",
] as const;

type JsonRecord = Record<string, unknown>;

type ActivityRow = {
  id: string;
  user_id: string;
  acting_as_actor_id: string;
  title: string | null;
  input_text: string | null;
  activity_role_code: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  metadata_json: unknown;
};

type ValueObjectRow = {
  id: string;
  title: string | null;
  description: string | null;
  canonical_key: string | null;
  parent_value_object_id: string | null;
  root_value_object_id: string | null;
  ontology_node_role_code: string | null;
  object_kind: string | null;
  facet_code: string | null;
  status: string | null;
  scope_code: string | null;
  metadata_json: unknown;
  identity_attributes_json: unknown;
};

type CatalogLeaf = {
  id: string;
  title: string;
  canonicalKey: string | null;
  pathText: string;
  objectKind: string | null;
  facetCode: string | null;
};

type ModelMeasurement = {
  parameterCode?: unknown;
  measureType?: unknown;
  unit?: unknown;
  valueType?: unknown;
  valueNumeric?: unknown;
  valueText?: unknown;
  valueBoolean?: unknown;
  rawFragment?: unknown;
};

type ModelProposal = {
  valueObjectId?: unknown;
  isPrimary?: unknown;
  lensCode?: unknown;
  relationMode?: unknown;
  rationale?: unknown;
  interpretationText?: unknown;
};

type ModelOutput = {
  measurements?: unknown;
  proposals?: unknown;
};

type NormalizedMeasurement = {
  parameterCode: string;
  measureType: string;
  unit: string;
  valueType: "numeric" | "text" | "boolean";
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  rawFragment: string;
};

type NormalizedProposal = {
  valueObjectId: string;
  canonicalKey: string | null;
  title: string;
  pathText: string;
  isPrimary: boolean;
  lensCode: string;
  relationMode:
    | "direct"
    | "higher_level"
    | "contextual"
    | "future_use";
  rationale: string;
  interpretationText: string;
};

type BudgetReservation = {
  reservationId: string;
  priceSnapshotId: string;
  requestedCallMaxCostUsd: number | null;
};

type ActorRecognitionExampleRow = {
  value_object_id: string;
  example_text: string;
  normalized_text: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown): string | null {
  const normalized = asText(value);
  return normalized || null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeLocale(value: unknown) {
  const locale = asText(value);
  return SUPPORTED_LOCALES.has(locale) ? locale : "ru";
}

function sourceHash(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function estimateInputTokensUpperBound(input: {
  system: string;
  user: unknown;
  schema: Record<string, unknown>;
}) {
  const serialized =
    input.system + JSON.stringify(input.user) + JSON.stringify(input.schema);
  return Buffer.byteLength(serialized, "utf8") + 1_024;
}

function buildPath(
  leaf: ValueObjectRow,
  byId: Map<string, ValueObjectRow>,
) {
  const path: string[] = [];
  const visited = new Set<string>();
  let current: ValueObjectRow | undefined = leaf;

  for (let depth = 0; current && depth < 200; depth += 1) {
    if (visited.has(current.id)) break;
    visited.add(current.id);

    const title = asText(current.title);
    if (title) path.push(title);

    current = current.parent_value_object_id
      ? byId.get(current.parent_value_object_id)
      : undefined;
  }

  return path.reverse().join(" › ");
}

async function loadAccessibleLeafCatalog(input: {
  appUserId: string;
  actorId: string;
  locale: string;
}): Promise<CatalogLeaf[]> {
  const globalLocale = normalizeGlobalSystemValueObjectLocale(input.locale);
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,ontology_node_role_code,object_kind,facet_code,status,scope_code,owner_user_id,owner_actor_id,metadata_json,identity_attributes_json",
    )
    .in("status", ["active", "draft"])
    .order("canonical_key");

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_LEAF_CATALOG_READ_FAILED:${error.message}`,
    );
  }

  const accessibleRows = ((data ?? []) as Array<
    ValueObjectRow & {
      owner_user_id?: string | null;
      owner_actor_id?: string | null;
    }
  >).filter(
    (row) =>
      (row.scope_code === "global" && row.status === "active") ||
      (
        row.owner_user_id === input.appUserId &&
        row.owner_actor_id === input.actorId &&
        (row.status === "active" || row.status === "draft")
      ),
  );

  const rows = accessibleRows.map((row) =>
    row.scope_code === "global"
      ? (localizeGlobalSystemValueObject(
          row,
          globalLocale,
        ) as ValueObjectRow)
      : (row as ValueObjectRow),
  );

  const byId = new Map(rows.map((row) => [row.id, row]));

  const leaves = rows
    .filter((row) => row.ontology_node_role_code === "leaf")
    .map((row) => ({
      id: row.id,
      title: asText(row.title),
      canonicalKey: asNullableText(row.canonical_key),
      pathText: buildPath(row, byId),
      objectKind: asNullableText(row.object_kind),
      facetCode: asNullableText(row.facet_code),
    }))
    .filter((row) => row.title && row.pathText);

  if (leaves.length < MIN_PROPOSALS) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_ACCESSIBLE_LEAF_CATALOG_TOO_SMALL:${leaves.length}`,
    );
  }

  return leaves;
}

async function loadActorRecognitionExamples(input: {
  appUserId: string;
  actorId: string;
  locale: string;
}) {
  const { data, error } = await supabase
    .from("actor_value_object_recognition_examples_a31")
    .select(
      "value_object_id,example_text,normalized_text,created_at",
    )
    .eq("app_user_id", input.appUserId)
    .eq("actor_id", input.actorId)
    .eq("locale_code", input.locale)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_ACTOR_EXAMPLES_READ_FAILED:${error.message}`,
    );
  }

  return ((data ?? []) as ActorRecognitionExampleRow[]).map((row) => ({
    valueObjectId: String(row.value_object_id),
    exampleText: String(row.example_text),
    normalizedText: String(row.normalized_text),
  }));
}

async function resolveModel() {
  const { data, error } = await supabase
    .from("ai_model_tiers")
    .select("tier_code,default_model_name,enabled")
    .eq("tier_code", "standard")
    .maybeSingle();

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_MODEL_READ_FAILED:${error.message}`,
    );
  }

  if (
    !data ||
    data.enabled !== true ||
    !asText(data.default_model_name)
  ) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_STANDARD_MODEL_UNAVAILABLE",
    );
  }

  return {
    tierCode: "standard",
    modelName: asText(data.default_model_name),
  };
}

async function reserveBudget(input: {
  userId: string;
  operationId: string;
  tierCode: string;
  modelName: string;
  estimatedInputTokens: number;
}) {
  const { data, error } = await supabase.rpc(
    "preflight_ai_pilot_call_budget_v1",
    {
      p_app_user_id: input.userId,
      p_operation_id: input.operationId,
      p_tier_code: input.tierCode,
      p_model_name: input.modelName,
      p_input_tokens: input.estimatedInputTokens,
      p_cached_input_tokens: 0,
      p_max_output_tokens: MAX_OUTPUT_TOKENS,
    },
  );

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_BUDGET_PREFLIGHT_FAILED:${error.message}`,
    );
  }

  const row = asRecord(data);

  if (row.allowed !== true) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_BUDGET_BLOCKED:${asText(row.reason) || "UNKNOWN"}`,
    );
  }

  const reservationId = asText(row.reservationId);
  const priceSnapshotId = asText(row.priceSnapshotId);

  if (!reservationId || !priceSnapshotId) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_BUDGET_RESERVATION_INVALID",
    );
  }

  return {
    reservationId,
    priceSnapshotId,
    requestedCallMaxCostUsd: asFiniteNumber(
      row.requestedCallMaxCostUsd,
    ),
  } satisfies BudgetReservation;
}

async function createUsageEvent(input: {
  userId: string;
  analysisExecutionId: string;
  operationId: string;
  tierCode: string;
  modelName: string;
  reservation: BudgetReservation;
  estimatedInputTokens: number;
}) {
  const { data, error } = await supabase
    .from("ai_usage_events")
    .insert({
      app_user_id: input.userId,
      analysis_execution_id: input.analysisExecutionId,
      selected_tier_code: input.tierCode,
      model_name: input.modelName,
      provider: "openai",
      route_path: ROUTE_PATH,
      operation_kind: "semantic_intake",
      input_tokens: input.estimatedInputTokens,
      cached_input_tokens: 0,
      output_tokens: 0,
      total_tokens: input.estimatedInputTokens,
      status: "preflight_allowed",
      request_metadata: {
        contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
        stage: "creative_semantic_review",
        walletDebited: false,
        conservativeInputTokenUpperBound: input.estimatedInputTokens,
      },
      response_metadata: {},
      pilot_operation_id: input.operationId,
      pilot_budget_reservation_id: input.reservation.reservationId,
      estimated_provider_cost_usd:
        input.reservation.requestedCallMaxCostUsd,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_USAGE_CREATE_FAILED:${error?.message ?? "missing id"}`,
    );
  }

  return String(data.id);
}

async function actualProviderCost(input: {
  priceSnapshotId: string;
  usage: RunAiJsonUsageMetadata;
}) {
  const { data, error } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "input_cost_per_1m_tokens,cached_input_cost_per_1m_tokens,output_cost_per_1m_tokens",
    )
    .eq("id", input.priceSnapshotId)
    .maybeSingle();

  if (error || !data) return null;

  const inputPrice = asFiniteNumber(data.input_cost_per_1m_tokens);
  const cachedPrice =
    asFiniteNumber(data.cached_input_cost_per_1m_tokens) ??
    inputPrice;
  const outputPrice = asFiniteNumber(data.output_cost_per_1m_tokens);

  if (
    inputPrice === null ||
    cachedPrice === null ||
    outputPrice === null
  ) {
    return null;
  }

  const cached = Math.min(
    input.usage.inputTokens,
    input.usage.cachedInputTokens,
  );
  const uncached = Math.max(0, input.usage.inputTokens - cached);

  return (
    uncached * inputPrice +
    cached * cachedPrice +
    input.usage.outputTokens * outputPrice
  ) / 1_000_000;
}

async function finalizeUsage(input: {
  usageEventId: string;
  priceSnapshotId: string;
  usage: RunAiJsonUsageMetadata;
}) {
  const cost = await actualProviderCost({
    priceSnapshotId: input.priceSnapshotId,
    usage: input.usage,
  });

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      input_tokens: input.usage.inputTokens,
      cached_input_tokens: input.usage.cachedInputTokens,
      output_tokens: input.usage.outputTokens,
      total_tokens: input.usage.totalTokens,
      actual_provider_cost_usd: cost,
      status: "openai_completed",
      openai_response_id: input.usage.responseId,
      response_metadata: {
        contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
        rawUsage: input.usage.rawUsage,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.usageEventId);

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_USAGE_FINALIZE_FAILED:${error.message}`,
    );
  }
}

async function markUsageFailed(usageEventId: string) {
  await supabase
    .from("ai_usage_events")
    .update({
      status: "openai_failed",
      error_code: "AI_A3_1_SEMANTIC_REVIEW_STAGE_FAILED",
      error_message:
        "Semantic review AI stage failed; provider output is not stored here.",
      completed_at: new Date().toISOString(),
    })
    .eq("id", usageEventId);
}

function semanticReviewSchema(leafIds: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["measurements", "proposals"],
    properties: {
      measurements: {
        type: "array",
        minItems: 0,
        maxItems: MAX_MEASUREMENTS,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "parameterCode",
            "measureType",
            "unit",
            "valueType",
            "valueNumeric",
            "valueText",
            "valueBoolean",
            "rawFragment",
          ],
          properties: {
            parameterCode: {
              type: "string",
              pattern: "^[a-z][a-z0-9_]{0,79}$",
            },
            measureType: {
              type: "string",
              enum: [...MEASURE_TYPES],
            },
            unit: {
              type: "string",
              pattern: "^[a-z][a-z0-9_]{0,63}$",
            },
            valueType: {
              type: "string",
              enum: ["numeric", "text", "boolean"],
            },
            valueNumeric: { type: ["number", "null"] },
            valueText: { type: ["string", "null"] },
            valueBoolean: { type: ["boolean", "null"] },
            rawFragment: { type: "string" },
          },
        },
      },
      proposals: {
        type: "array",
        minItems: MIN_PROPOSALS,
        maxItems: MAX_PROPOSALS,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "valueObjectId",
            "isPrimary",
            "lensCode",
            "relationMode",
            "rationale",
            "interpretationText",
          ],
          properties: {
            valueObjectId: {
              type: "string",
              enum: leafIds,
            },
            isPrimary: { type: "boolean" },
            lensCode: {
              type: "string",
              enum: [...LENS_CODES],
            },
            relationMode: {
              type: "string",
              enum: [
                "direct",
                "higher_level",
                "contextual",
                "future_use",
              ],
            },
            rationale: {
              type: "string",
              minLength: 1,
              maxLength: 600,
            },
            interpretationText: {
              type: "string",
              minLength: 1,
              maxLength: 360,
            },
          },
        },
      },
    },
  } as Record<string, unknown>;
}

function validateModelMeasurements(
  raw: unknown,
): NormalizedMeasurement[] {
  if (!Array.isArray(raw) || raw.length > MAX_MEASUREMENTS) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_MEASUREMENT_ARRAY_INVALID",
    );
  }

  const output: NormalizedMeasurement[] = [];
  const seen = new Set<string>();

  for (const item of raw as ModelMeasurement[]) {
    const parameterCode = asText(item.parameterCode).toLowerCase();
    const measureType = asText(item.measureType).toLowerCase();
    const unit = asText(item.unit).toLowerCase();
    const valueType = asText(item.valueType);
    const rawFragment = asText(item.rawFragment);

    if (
      !/^[a-z][a-z0-9_]{0,79}$/.test(parameterCode) ||
      !MEASURE_TYPES.has(measureType) ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(unit) ||
      !["numeric", "text", "boolean"].includes(valueType) ||
      !rawFragment
    ) {
      throw new Error(
        "AI_A3_1_SEMANTIC_REVIEW_MEASUREMENT_CONTRACT_INVALID",
      );
    }

    let valueNumeric: number | null = null;
    let valueText: string | null = null;
    let valueBoolean: boolean | null = null;

    if (valueType === "numeric") {
      valueNumeric = asFiniteNumber(item.valueNumeric);
      if (valueNumeric === null) {
        throw new Error(
          "AI_A3_1_SEMANTIC_REVIEW_MEASUREMENT_NUMERIC_INVALID",
        );
      }
    } else if (valueType === "text") {
      valueText = asNullableText(item.valueText);
      if (!valueText) {
        throw new Error(
          "AI_A3_1_SEMANTIC_REVIEW_MEASUREMENT_TEXT_INVALID",
        );
      }
    } else {
      if (typeof item.valueBoolean !== "boolean") {
        throw new Error(
          "AI_A3_1_SEMANTIC_REVIEW_MEASUREMENT_BOOLEAN_INVALID",
        );
      }
      valueBoolean = item.valueBoolean;
    }

    const key = [
      parameterCode,
      measureType,
      unit,
      valueType,
      String(valueNumeric),
      valueText ?? "",
      String(valueBoolean),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);

    output.push({
      parameterCode,
      measureType,
      unit,
      valueType: valueType as "numeric" | "text" | "boolean",
      valueNumeric,
      valueText,
      valueBoolean,
      rawFragment: rawFragment.slice(0, 1000),
    });
  }

  return output;
}

function ensureUniversalMeasurements(input: {
  measurements: NormalizedMeasurement[];
  activity: ActivityRow;
}) {
  const output = input.measurements.filter(
    (item) => item.parameterCode !== "process_count",
  );

  if (
    input.activity.duration_minutes !== null &&
    Number.isFinite(input.activity.duration_minutes) &&
    input.activity.duration_minutes >= 0
  ) {
    const withoutDuration = output.filter(
      (item) => item.parameterCode !== "duration",
    );

    withoutDuration.push({
      parameterCode: "duration",
      measureType: "duration",
      unit: "minute",
      valueType: "numeric",
      valueNumeric: input.activity.duration_minutes,
      valueText: null,
      valueBoolean: null,
      rawFragment: "server activity duration",
    });

    output.length = 0;
    output.push(...withoutDuration);
  }

  output.push({
    parameterCode: "process_count",
    measureType: "count",
    unit: "count",
    valueType: "numeric",
    valueNumeric: 1,
    valueText: null,
    valueBoolean: null,
    rawFragment: "activity episode",
  });

  if (output.length > 30) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_MEASUREMENT_LIMIT_AFTER_UNIVERSAL",
    );
  }

  return output;
}

function validateModelProposals(input: {
  raw: unknown;
  catalog: CatalogLeaf[];
}): NormalizedProposal[] {
  if (
    !Array.isArray(input.raw) ||
    input.raw.length < MIN_PROPOSALS ||
    input.raw.length > MAX_PROPOSALS
  ) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_PROPOSAL_COUNT_INVALID",
    );
  }

  const byId = new Map(input.catalog.map((leaf) => [leaf.id, leaf]));
  const seenIds = new Set<string>();
  const proposals: NormalizedProposal[] = [];
  let primaryCount = 0;

  for (const row of input.raw as ModelProposal[]) {
    const valueObjectId = asText(row.valueObjectId);
    const leaf = byId.get(valueObjectId);
    const lensCode = asText(row.lensCode);
    const relationMode = asText(row.relationMode);
    const rationale = asText(row.rationale);
    const interpretationText = asText(row.interpretationText);
    const isPrimary = row.isPrimary === true;

    if (
      !leaf ||
      seenIds.has(valueObjectId) ||
      !LENS_CODES.includes(
        lensCode as (typeof LENS_CODES)[number],
      ) ||
      ![
        "direct",
        "higher_level",
        "contextual",
        "future_use",
      ].includes(relationMode) ||
      !rationale ||
      !interpretationText
    ) {
      throw new Error(
        "AI_A3_1_SEMANTIC_REVIEW_PROPOSAL_CONTRACT_INVALID",
      );
    }

    if (isPrimary) primaryCount += 1;
    seenIds.add(valueObjectId);

    proposals.push({
      valueObjectId,
      canonicalKey: leaf.canonicalKey,
      title: leaf.title,
      pathText: leaf.pathText,
      isPrimary,
      lensCode,
      relationMode: relationMode as NormalizedProposal["relationMode"],
      rationale: rationale.slice(0, 600),
      interpretationText: interpretationText.slice(0, 360),
    });
  }

  if (primaryCount !== 1) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_PRIMARY_COUNT_INVALID:${primaryCount}`,
    );
  }

  return proposals.sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }
    return 0;
  });
}

async function readExistingDraft(input: {
  activityEventId: string;
  appUserId: string;
  actorId: string;
  sourceTextHash: string;
}) {
  const { data, error } = await supabase
    .from("activity_semantic_review_drafts_a31")
    .select("*")
    .eq("activity_event_id", input.activityEventId)
    .eq("app_user_id", input.appUserId)
    .eq("actor_id", input.actorId)
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_DRAFT_READ_FAILED:${error.message}`,
    );
  }

  if (!data) return null;

  if (data.source_text_hash !== input.sourceTextHash) {
    const { error: supersedeError } = await supabase
      .from("activity_semantic_review_drafts_a31")
      .update({
        status: "superseded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "draft");

    if (supersedeError) {
      throw new Error(
        `AI_A3_1_SEMANTIC_REVIEW_DRAFT_SUPERSEDE_FAILED:${supersedeError.message}`,
      );
    }

    return null;
  }

  return data;
}

function formatDraft(data: JsonRecord, activity: ActivityRow) {
  return {
    contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
    cached: true,
    activity: {
      id: activity.id,
      title: activity.title,
      inputText: activity.input_text,
      role: activity.activity_role_code,
      startedAt: activity.started_at,
      endedAt: activity.ended_at,
      durationMinutes: activity.duration_minutes,
    },
    draft: {
      id: String(data.id),
      status: String(data.status),
      measurements: Array.isArray(data.measurements_json)
        ? data.measurements_json
        : [],
      proposals: Array.isArray(data.proposals_json)
        ? data.proposals_json
        : [],
      analysisExecutionId: data.analysis_execution_id
        ? String(data.analysis_execution_id)
        : null,
      modelTier: data.model_tier ? String(data.model_tier) : null,
      modelName: data.model_name ? String(data.model_name) : null,
    },
  };
}

export async function analyzeActivityForSemanticReviewA31(input: {
  appUserId: string;
  actorId: string;
  activityEventId: string;
  locale: unknown;
  timeZone: string;
}) {
  const locale = normalizeLocale(input.locale);

  const { data: activityData, error: activityError } = await supabase
    .from("activity_events")
    .select(
      "id,user_id,acting_as_actor_id,title,input_text,activity_role_code,started_at,ended_at,duration_minutes,metadata_json",
    )
    .eq("id", input.activityEventId)
    .eq("user_id", input.appUserId)
    .eq("acting_as_actor_id", input.actorId)
    .maybeSingle();

  if (activityError) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_ACTIVITY_READ_FAILED:${activityError.message}`,
    );
  }

  const activity = activityData as ActivityRow | null;

  if (!activity) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_ACTIVITY_NOT_FOUND_OR_NOT_OWNED",
    );
  }

  const activityMetadata = asRecord(activity.metadata_json);

  if (
    activityMetadata.quickCaptureContract !==
      "ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1" ||
    activityMetadata.quickCaptureReviewRequired !== true ||
    activityMetadata.quickCaptureReviewStatus === "resolved"
  ) {
    throw new Error(
      "AI_A3_1_SEMANTIC_REVIEW_ACTIVITY_NOT_REVIEW_FIRST_PENDING",
    );
  }

  const sourceText =
    asText(activity.input_text) || asText(activity.title);

  if (!sourceText) {
    throw new Error("AI_A3_1_SEMANTIC_REVIEW_SOURCE_TEXT_EMPTY");
  }

  const sourceTextHash = sourceHash(sourceText);

  const existing = await readExistingDraft({
    activityEventId: activity.id,
    appUserId: input.appUserId,
    actorId: input.actorId,
    sourceTextHash,
  });

  if (existing) {
    return formatDraft(asRecord(existing), activity);
  }

  const [catalog, actorExamples, model] = await Promise.all([
    loadAccessibleLeafCatalog({
      appUserId: input.appUserId,
      actorId: input.actorId,
      locale,
    }),
    loadActorRecognitionExamples({
      appUserId: input.appUserId,
      actorId: input.actorId,
      locale,
    }),
    resolveModel(),
  ]);

  const leafIds = catalog.map((leaf) => leaf.id);
  const schema = semanticReviewSchema(leafIds);

  const system = `
You analyze one already-saved ARCTor activity for HUMAN semantic review.

The user needs help seeing meaning that is not obvious at first glance.
Do not merely paraphrase the action. Think from the particular event toward broader
processes, states, relationships, roles, resources, consequences and useful possibilities.

Hard rules:
1. Measurements must contain ONLY quantities/states explicitly supported by the user's
   text or the supplied server timing. Never invent a measured value.
2. Do NOT output process_count. The server always adds process_count=1.
3. Choose only leaf IDs from accessibleLeafCatalog. The catalog may contain
   both GLOBAL system leaves and leaf objects owned by the current actor.
4. Return exactly one primary leaf and at least seven additional DISTINCT leaves.
5. Additional leaves must be genuinely different analytical perspectives, not synonyms.
6. Deliberately examine these lenses:
   direct action; broader process; state; entity; relationship; role; knowledge;
   behavioral pattern; context; resource spent; resource created; material result;
   information result; work result; learning result; physical result; emotional result;
   social result; relational result; reputational result; economic result;
   new obligation; fulfilled obligation; new opportunity; new limitation;
   opportunity cost; short/medium/long-term consequence; future-use possibility.
7. A creative proposal may be abstract and non-obvious if it is useful. Example:
   walking a dog may relate to obligatory routines, physical activity, social-contact
   opportunities or walking meditation.
8. Never claim that an unstated event actually happened. If the connection is only a
   possible future use, set relationMode="future_use" and phrase interpretationText as
   a possibility, not as a completed event.
9. The save stage is intentionally simple: if the human keeps a leaf, every extracted
   measurement will later be written as a separate fact tagged by that leaf.
   Therefore your job here is to propose useful semantic perspectives for the HUMAN
   to accept/reject/replace. Do not perform a "parameter compatible with leaf" check.
10. One selected leaf is the primary direct/broad meaning. Other leafs may express
    consequences, roles, contexts, resources or possibilities.
11. Prefer semantic diversity over superficial lexical similarity.
12. Measurement parameterCode must be a stable, primitive, reusable English
    snake_case concept, not a sentence and not a leaf-specific interpretation.
    Prefer universal codes such as duration, distance, mass, money,
    repetition_count, temperature, process_count (but process_count itself is
    server-added), etc.
13. Normalize units to stable English singular snake_case codes. Prefer
    minute, hour, meter, kilometer, count, repetition, set, milliliter, liter,
    milligram, gram, kilogram, kcal, pln, eur, usd, score_0_10, boolean, text,
    tag, role, km_per_hour and similarly stable SI/domain unit slugs. Do not
    output localized unit words or abbreviations such as "мин", "km", "kg".
14. Return only the required JSON.
`.trim();

  const user = {
    contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
    sourceText,
    locale,
    timeZone: input.timeZone,
    serverActivity: {
      activityEventId: activity.id,
      role: activity.activity_role_code,
      startedAt: activity.started_at,
      endedAt: activity.ended_at,
      durationMinutes: activity.duration_minutes,
    },
    actorRecognitionExamples: actorExamples,
    accessibleLeafCatalog: catalog,
  };

  const operationId = crypto.randomUUID();

  const analysisExecutionId = await createAiAnalysisExecution({
    appUserId: input.appUserId,
    actorId: input.actorId,
    externalOperationId: operationId,
    surfaceCode: "activity_semantic_review",
    operationKind: "activity_semantic_intake",
    localeCode: locale,
    timeZone: input.timeZone,
    inputText: sourceText,
    metadata: {
      contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
      activityEventId: activity.id,
      modelTierPolicy: "standard_required_no_nano_fallback",
      providerCallCountExpected: 1,
      creativeReview: true,
      factsWritten: false,
    },
  });

  let usageEventId: string | null = null;
  let manifestId: string | null = null;

  try {
    const compiled = await compileRuntimeContextPackV1({
      appUserId: input.appUserId,
      actorId: input.actorId,
      runtimeCode: "activity_semantic_preview",
      locale,
      timeZone: input.timeZone,
      stageCode: "creative_semantic_review",
      stageSequence: 1,
      protocolCode: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
      protocolVersion: "1",
      schemaName: "activity_semantic_review_a31",
      schemaVersion: "1",
      schema,
      provider: "openai",
      modelName: model.modelName,
      modelTier: model.tierCode,
      storeProviderState: false,
      maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      modelConfig: {
        reasoningEffort: "low",
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
      },
      embeddedSystemPrompt: system,
      requestPayload: user,
      retrievalSnapshot: {
        accessibleLeafCatalogCount: catalog.length,
        accessibleLeafCatalogHash: sourceHash(JSON.stringify(catalog)),
        actorRecognitionExampleCount: actorExamples.length,
      },
      toolPermissions: [],
      contextMetadata: {
        activityEventId: activity.id,
        reviewBeforeFactCommit: true,
        minimumProposalCount: MIN_PROPOSALS,
      },
    });

    const estimatedInputTokens = estimateInputTokensUpperBound({
      system: compiled.systemPrompt,
      user: compiled.requestPayload,
      schema,
    });

    if (estimatedInputTokens > INPUT_TOKEN_CEILING) {
      throw new Error(
        `AI_A3_1_SEMANTIC_REVIEW_INPUT_TOO_LARGE:${estimatedInputTokens}`,
      );
    }

    const reservation = await reserveBudget({
      userId: input.appUserId,
      operationId,
      tierCode: model.tierCode,
      modelName: model.modelName,
      estimatedInputTokens,
    });

    usageEventId = await createUsageEvent({
      userId: input.appUserId,
      analysisExecutionId,
      operationId,
      tierCode: model.tierCode,
      modelName: model.modelName,
      reservation,
      estimatedInputTokens,
    });

    manifestId = await createAiContextManifest({
      analysisExecutionId,
      stageCode: "creative_semantic_review",
      stageSequence: 1,
      aiUsageEventId: usageEventId,
      protocolCode: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
      protocolVersion: "1",
      schemaName: "activity_semantic_review_a31",
      schemaVersion: "1",
      schema,
      systemPrompt: compiled.systemPrompt,
      requestPayload: compiled.requestPayload,
      provider: "openai",
      modelName: model.modelName,
      modelTier: model.tierCode,
      storeProviderState: false,
      maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      instructionRefs: compiled.instructionRefs,
      retrievalSnapshot: compiled.retrievalSnapshot,
      toolPermissions: compiled.toolPermissions,
      modelConfig: {
        reasoningEffort: "low",
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
      },
      contextMetadata: compiled.contextMetadata,
    });

    const response = await runAiJsonWithUsageMetadata<ModelOutput>({
      system: compiled.systemPrompt,
      user: compiled.requestPayload,
      model: model.modelName,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      structuredOutput: {
        name: "activity_semantic_review_a31",
        schema,
        strict: true,
      },
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
      store: false,
      reasoningEffort: "low",
      outputTokenCeiling: MAX_OUTPUT_TOKENS,
    });

    await markAiContextManifestProviderCompleted(
      manifestId,
      response.outputText,
    );

    await finalizeUsage({
      usageEventId,
      priceSnapshotId: reservation.priceSnapshotId,
      usage: response.usage,
    });

    const measurements = ensureUniversalMeasurements({
      measurements: validateModelMeasurements(
        response.parsed.measurements,
      ),
      activity,
    });

    const proposals = validateModelProposals({
      raw: response.parsed.proposals,
      catalog,
    });

    await markAiContextManifestValidated(manifestId, {
      passed: true,
      contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
      measurementCount: measurements.length,
      proposalCount: proposals.length,
      primaryCount: proposals.filter((row) => row.isPrimary).length,
      allProposalsAreExistingLeaves: true,
      minimumFiveAdditionalLeaves: proposals.length >= 6,
      factsWritten: false,
    });

    await completeAiAnalysisExecution(analysisExecutionId);

    const { data: draft, error: draftError } = await supabase
      .from("activity_semantic_review_drafts_a31")
      .insert({
        activity_event_id: activity.id,
        app_user_id: input.appUserId,
        actor_id: input.actorId,
        source_text_hash: sourceTextHash,
        locale_code: locale,
        time_zone: input.timeZone,
        analysis_execution_id: analysisExecutionId,
        status: "draft",
        measurements_json: measurements,
        proposals_json: proposals,
        model_tier: model.tierCode,
        model_name: model.modelName,
      })
      .select("*")
      .single();

    if (draftError || !draft) {
      throw new Error(
        `AI_A3_1_SEMANTIC_REVIEW_DRAFT_WRITE_FAILED:${draftError?.message ?? "missing row"}`,
      );
    }

    return {
      ...formatDraft(asRecord(draft), activity),
      cached: false,
      providerCalls: 1,
    };
  } catch (error) {
    if (manifestId) {
      await markAiContextManifestFailed(manifestId, error);
    }
    if (usageEventId) {
      await markUsageFailed(usageEventId);
    }
    await failAiAnalysisExecution(analysisExecutionId, error);
    throw error;
  }
}
