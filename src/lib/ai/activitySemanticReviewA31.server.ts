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
import { compileRuntimeContextPackV1 } from "./runtimeContextCompiler.server";

export const AI_A3_1_SEMANTIC_REVIEW_CONTRACT =
  "ARCTOR_AI_A3_1_FREE_SEMANTIC_PROPOSALS_V2" as const;

const ROUTE_PATH = "/api/activity/review-analysis";
const MIN_PROPOSALS = 8;
const MAX_PROPOSALS = 12;
const MAX_MEASUREMENTS = 20;
const MAX_OUTPUT_TOKENS = 2800;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 0;
const INPUT_TOKEN_CEILING = 40_000;
const ACTIVITY_EVIDENCE_BUCKET = "activity-evidence-media-v1";
const MAX_ACTIVITY_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_ACTIVITY_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const STANDARD_PRICE_REFRESH_VERIFIED_AT = "2026-08-19T00:00:00.000Z";
const STANDARD_PRICE_REFRESH_EXPIRES_AT = "2026-08-26T23:59:59.999Z";
const STANDARD_PRICE_SOURCE_URL =
  "https://developers.openai.com/api/docs/models/gpt-5.4-mini";

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

const FACET_HINTS = [
  "PROCESS",
  "STATE",
  "ENTITY",
  "RELATIONSHIP",
  "ROLE",
  "KNOWLEDGE",
  "BEHAVIOR",
  "CONTEXT",
  "UNKNOWN",
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

type ActivityImageEvidence = {
  kind: "image";
  storageBucket: typeof ACTIVITY_EVIDENCE_BUCKET;
  storagePath: string;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  sha256: string;
  provenance: "user_uploaded_raw_evidence";
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
  title?: unknown;
  searchTerms?: unknown;
  facetHint?: unknown;
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
  proposalKind: "semantic_proposal";
  valueObjectId: null;
  canonicalKey: null;
  title: string;
  pathText: "";
  searchTerms: string[];
  facetHint: (typeof FACET_HINTS)[number];
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


function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function readActivityImageEvidence(value: unknown): ActivityImageEvidence | null {
  const record = asRecord(value);
  if (
    record.kind !== "image" ||
    record.storageBucket !== ACTIVITY_EVIDENCE_BUCKET ||
    typeof record.storagePath !== "string" ||
    typeof record.originalName !== "string" ||
    typeof record.mimeType !== "string" ||
    !ALLOWED_ACTIVITY_IMAGE_MIME_TYPES.has(record.mimeType) ||
    typeof record.sizeBytes !== "number" ||
    record.sizeBytes <= 0 ||
    record.sizeBytes > MAX_ACTIVITY_IMAGE_BYTES ||
    typeof record.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/i.test(record.sha256) ||
    record.provenance !== "user_uploaded_raw_evidence"
  ) {
    return null;
  }

  return record as ActivityImageEvidence;
}

async function loadActivityImageDataUrl(input: {
  appUserId: string;
  evidence: ActivityImageEvidence;
}) {
  if (!input.evidence.storagePath.startsWith(`${input.appUserId}/`)) {
    throw new Error("AI_A3_1_SEMANTIC_REVIEW_IMAGE_OWNERSHIP_PATH_INVALID");
  }

  const { data, error } = await supabase.storage
    .from(ACTIVITY_EVIDENCE_BUCKET)
    .download(input.evidence.storagePath);

  if (error || !data) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_IMAGE_DOWNLOAD_FAILED:${error?.message ?? "missing blob"}`,
    );
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length <= 0 || bytes.length > MAX_ACTIVITY_IMAGE_BYTES) {
    throw new Error("AI_A3_1_SEMANTIC_REVIEW_IMAGE_SIZE_INVALID");
  }

  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== input.evidence.sha256.toLowerCase()) {
    throw new Error("AI_A3_1_SEMANTIC_REVIEW_IMAGE_HASH_MISMATCH");
  }

  return `data:${input.evidence.mimeType};base64,${bytes.toString("base64")}`;
}

async function refreshStandardPriceSnapshotWithinVerifiedLease(input: {
  tierCode: string;
  modelName: string;
}) {
  if (
    input.tierCode !== "standard" ||
    input.modelName !== "gpt-5.4-mini" ||
    Date.now() > Date.parse(STANDARD_PRICE_REFRESH_EXPIRES_AT)
  ) {
    return false;
  }

  const { data: current, error: currentError } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "id,input_cost_per_1m_tokens,cached_input_cost_per_1m_tokens,output_cost_per_1m_tokens,usd_to_eur_rate,eur_markup_multiplier",
    )
    .eq("provider", "openai")
    .eq("tier_code", "standard")
    .eq("model_name", "gpt-5.4-mini")
    .eq("pricing_currency", "USD")
    .eq("is_active", true)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentError || !current) {
    throw new Error(
      `AI_A3_1_PRICE_REFRESH_BASELINE_READ_FAILED:${currentError?.message ?? "missing snapshot"}`,
    );
  }

  const inputPrice = asFiniteNumber(current.input_cost_per_1m_tokens);
  const cachedPrice = asFiniteNumber(current.cached_input_cost_per_1m_tokens);
  const outputPrice = asFiniteNumber(current.output_cost_per_1m_tokens);

  if (inputPrice !== 0.75 || cachedPrice !== 0.075 || outputPrice !== 4.5) {
    throw new Error("AI_A3_1_PRICE_REFRESH_BASELINE_MISMATCH_FAIL_CLOSED");
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("ai_model_price_snapshots")
    .insert({
      tier_code: "standard",
      model_name: "gpt-5.4-mini",
      provider: "openai",
      pricing_currency: "USD",
      display_currency: "EUR",
      input_cost_per_1m_tokens: 0.75,
      cached_input_cost_per_1m_tokens: 0.075,
      output_cost_per_1m_tokens: 4.5,
      usd_to_eur_rate: current.usd_to_eur_rate ?? null,
      eur_markup_multiplier: current.eur_markup_multiplier ?? 1,
      valid_from: now,
      valid_to: null,
      is_active: true,
      source_url: STANDARD_PRICE_SOURCE_URL,
      source_note:
        "Runtime self-heal refresh from server-shipped price catalog verified 2026-08-19; fail-closed after verification lease expiry.",
      metadata: {
        verification_contract: "ARCTOR_A3_1_STANDARD_PRICE_REFRESH_V1",
        verified_at: STANDARD_PRICE_REFRESH_VERIFIED_AT,
        verification_expires_at: STANDARD_PRICE_REFRESH_EXPIRES_AT,
        budget_currency: "USD",
        source: "official_openai_model_documentation",
      },
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(
      `AI_A3_1_PRICE_REFRESH_INSERT_FAILED:${insertError?.message ?? "missing inserted id"}`,
    );
  }

  const { error: closeError } = await supabase
    .from("ai_model_price_snapshots")
    .update({ is_active: false, valid_to: now })
    .eq("provider", "openai")
    .eq("tier_code", "standard")
    .eq("model_name", "gpt-5.4-mini")
    .eq("is_active", true)
    .neq("id", inserted.id);

  if (closeError) {
    // The newly inserted, newest snapshot remains authoritative. Cleanup can be retried later.
  }

  return true;
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

function serializeProviderInput(input: {
  system: string;
  user: unknown;
  schema: Record<string, unknown>;
}) {
  return input.system + JSON.stringify(input.user) + JSON.stringify(input.schema);
}

function estimateInputTokensForContextGuard(input: {
  system: string;
  user: unknown;
  schema: Record<string, unknown>;
}) {
  const serialized = serializeProviderInput(input);
  const utf8Bytes = Buffer.byteLength(serialized, "utf8");
  const unicodeCodePoints = Array.from(serialized).length;

  // No model tokenizer is bundled in this service. Use a conservative
  // tokenizer-free estimate for the context guard instead of treating every
  // UTF-8 byte as one token. ASCII stays at one code-point unit, while
  // multibyte text keeps a 0.80-token-per-byte floor.
  return Math.max(
    unicodeCodePoints,
    Math.ceil(utf8Bytes * 0.80),
  ) + 1_024;
}

function estimateInputTokensForBudgetUpperBound(input: {
  system: string;
  user: unknown;
  schema: Record<string, unknown>;
}) {
  const serialized = serializeProviderInput(input);

  // Budget reservation intentionally remains more conservative than the
  // context guard so the existing monetary hard cap is never relaxed here.
  return Buffer.byteLength(serialized, "utf8") + 1_024;
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
  const budgetArgs = {
    p_app_user_id: input.userId,
    p_operation_id: input.operationId,
    p_tier_code: input.tierCode,
    p_model_name: input.modelName,
    p_input_tokens: input.estimatedInputTokens,
    p_cached_input_tokens: 0,
    p_max_output_tokens: MAX_OUTPUT_TOKENS,
  };

  let { data, error } = await supabase.rpc(
    "preflight_ai_pilot_call_budget_v1",
    budgetArgs,
  );

  if (error) {
    throw new Error(
      `AI_A3_1_SEMANTIC_REVIEW_BUDGET_PREFLIGHT_FAILED:${error.message}`,
    );
  }

  let row = asRecord(data);

  if (row.allowed !== true && asText(row.reason) === "PRICE_SNAPSHOT_STALE") {
    const refreshed = await refreshStandardPriceSnapshotWithinVerifiedLease({
      tierCode: input.tierCode,
      modelName: input.modelName,
    });

    if (refreshed) {
      const retry = await supabase.rpc(
        "preflight_ai_pilot_call_budget_v1",
        budgetArgs,
      );
      data = retry.data;
      error = retry.error;

      if (error) {
        throw new Error(
          `AI_A3_1_SEMANTIC_REVIEW_BUDGET_PREFLIGHT_RETRY_FAILED:${error.message}`,
        );
      }

      row = asRecord(data);
    }
  }

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

function semanticReviewSchema() {
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
            "title",
            "searchTerms",
            "facetHint",
            "isPrimary",
            "lensCode",
            "relationMode",
            "rationale",
            "interpretationText",
          ],
          properties: {
            title: { type: "string", minLength: 2, maxLength: 120 },
            searchTerms: {
              type: "array",
              minItems: 2,
              maxItems: 8,
              items: { type: "string", minLength: 2, maxLength: 80 },
            },
            facetHint: { type: "string", enum: [...FACET_HINTS] },
            isPrimary: { type: "boolean" },
            lensCode: { type: "string", enum: [...LENS_CODES] },
            relationMode: {
              type: "string",
              enum: ["direct", "higher_level", "contextual", "future_use"],
            },
            rationale: { type: "string", minLength: 1, maxLength: 600 },
            interpretationText: { type: "string", minLength: 1, maxLength: 360 },
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

function filterImageMeasurementsToDeclaredText(input: {
  measurements: NormalizedMeasurement[];
  declaredText: string;
}) {
  const declared = input.declaredText.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  if (!declared) return [];

  return input.measurements.filter((measurement) => {
    const fragment = measurement.rawFragment
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    return Boolean(fragment) && declared.includes(fragment);
  });
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

function normalizeProposalIdentity(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function validateModelProposals(raw: unknown): NormalizedProposal[] {
  if (
    !Array.isArray(raw) ||
    raw.length < MIN_PROPOSALS ||
    raw.length > MAX_PROPOSALS
  ) {
    throw new Error("AI_A3_1_SEMANTIC_REVIEW_PROPOSAL_COUNT_INVALID");
  }

  const seenTitles = new Set<string>();
  const proposals: NormalizedProposal[] = [];
  let primaryCount = 0;

  for (const row of raw as ModelProposal[]) {
    const title = asText(row.title);
    const titleIdentity = normalizeProposalIdentity(title);
    const lensCode = asText(row.lensCode);
    const relationMode = asText(row.relationMode);
    const facetHint = asText(row.facetHint).toUpperCase();
    const rationale = asText(row.rationale);
    const interpretationText = asText(row.interpretationText);
    const isPrimary = row.isPrimary === true;

    const rawSearchTerms = Array.isArray(row.searchTerms)
      ? row.searchTerms.map(asText).filter(Boolean)
      : [];
    const searchTerms = Array.from(
      new Map(
        rawSearchTerms.map((term) => [normalizeProposalIdentity(term), term]),
      ).values(),
    );

    if (
      title.length < 2 ||
      title.length > 120 ||
      !titleIdentity ||
      seenTitles.has(titleIdentity) ||
      searchTerms.length < 2 ||
      searchTerms.length > 8 ||
      searchTerms.some((term) => term.length < 2 || term.length > 80) ||
      !FACET_HINTS.includes(facetHint as (typeof FACET_HINTS)[number]) ||
      !LENS_CODES.includes(lensCode as (typeof LENS_CODES)[number]) ||
      !["direct", "higher_level", "contextual", "future_use"].includes(
        relationMode,
      ) ||
      !rationale ||
      !interpretationText
    ) {
      throw new Error("AI_A3_1_SEMANTIC_REVIEW_PROPOSAL_CONTRACT_INVALID");
    }

    if (isPrimary) primaryCount += 1;
    seenTitles.add(titleIdentity);

    proposals.push({
      proposalKind: "semantic_proposal",
      valueObjectId: null,
      canonicalKey: null,
      title,
      pathText: "",
      searchTerms,
      facetHint: facetHint as (typeof FACET_HINTS)[number],
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
  const imageEvidence = readActivityImageEvidence(
    activityMetadata.quickCaptureImageEvidence,
  );

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

  const sourceTextHash = sourceHash(
    imageEvidence
      ? `${sourceText}\nimage-sha256:${imageEvidence.sha256}`
      : sourceText,
  );

  const existing = await readExistingDraft({
    activityEventId: activity.id,
    appUserId: input.appUserId,
    actorId: input.actorId,
    sourceTextHash,
  });

  if (existing) {
    return formatDraft(asRecord(existing), activity);
  }

  const userImageDataUrl = imageEvidence
    ? await loadActivityImageDataUrl({
        appUserId: input.appUserId,
        evidence: imageEvidence,
      })
    : null;

  const model = await resolveModel();

  const schema = semanticReviewSchema();

  const system = `
You analyze one already-saved ARCTor activity for HUMAN semantic review.

You are deliberately NOT given the ARCTor Value Object catalog. Do not guess or invent
valueObjectId, canonical_key, database identifiers, or claim that a matching ARCTor object exists.
Your job is to propose human-readable semantic meanings. Do not merely paraphrase the action.
ARCTor will perform a separate server-only search over existing GLOBAL and actor-owned leaf objects after your response,
and the human will choose which actual leaf, if any, should be linked.

Hard rules:
1. Measurements must contain ONLY quantities/states explicitly supported by the user's
   text or supplied server timing. Image evidence may inform semantic proposals, but MUST NOT
   create numeric measurements in this contract because image-derived measurement provenance
   is not yet committed by the downstream fact writer. Never invent a measured value.
2. Do NOT output process_count. The server always adds process_count=1.
3. Return exactly one primary semantic proposal and at least seven additional DISTINCT
   semantic proposals. These are ideas/meanings, not database objects.
4. Each proposal title must be concise and understandable in the user's locale.
5. Each proposal must contain 2-8 searchTerms for later deterministic server search.
   The FIRST search term must be the shortest concrete/common phrase most likely to occur
   in an existing title or alias. Other terms may be close synonyms. Do not use UUIDs or
   canonical database keys as search terms.
6. Additional proposals must be genuinely different analytical perspectives, not synonyms.
7. Deliberately examine these lenses:
   direct action; broader process; state; entity; relationship; role; knowledge;
   behavioral pattern; context; resource spent; resource created; material result;
   information result; work result; learning result; physical result; emotional result;
   social result; relational result; reputational result; economic result;
   new obligation; fulfilled obligation; new opportunity; new limitation;
   opportunity cost; short/medium/long-term consequence; future-use possibility.
8. A creative proposal may be abstract and non-obvious if useful. For example, walking
   a dog can suggest obligatory routine, physical activity, animal care, a social-contact
   opportunity, or space for reflection.
9. Never claim that an unstated event actually happened. If a connection is only a
   possible future use, set relationMode="future_use" and phrase interpretationText as
   a possibility, not as a completed event.
10. facetHint is only a coarse search hint (PROCESS/STATE/ENTITY/RELATIONSHIP/ROLE/
    KNOWLEDGE/BEHAVIOR/CONTEXT/UNKNOWN). It is NOT a database decision.
11. After the model response, no AI is used to resolve these proposals to existing leaves.
    The human explicitly chooses a server-search result. Facts are created only after Save.
12. Measurement parameterCode must be a stable, primitive, reusable English snake_case
    concept, not a sentence or proposal-specific interpretation.
13. Normalize units to stable English singular snake_case codes: minute, hour, meter,
    kilometer, count, repetition, set, milliliter, liter, milligram, gram, kilogram,
    kcal, pln, eur, usd, score_0_10, boolean, text, tag, role, km_per_hour, etc.
14. If a user-uploaded image is present, treat it as private raw evidence for semantic
    interpretation. You may identify visible entities, dishes, documents, schedule-like content,
    or context for proposals. Do not claim hidden ingredients, quantities, diagnoses, exact
    schedule times, or other facts that are not safely supported by the user's text/server timing.
15. Return only the required JSON.
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
    imageEvidence: imageEvidence
      ? {
          kind: imageEvidence.kind,
          originalName: imageEvidence.originalName,
          mimeType: imageEvidence.mimeType,
          sizeBytes: imageEvidence.sizeBytes,
          sha256: imageEvidence.sha256,
          provenance: imageEvidence.provenance,
        }
      : null,
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
      freeSemanticProposalMode: true,
      providerCatalogSent: false,
      serverLeafResolutionRequired: true,
      factsWritten: false,
      imageEvidencePresent: Boolean(imageEvidence),
      imageEvidenceProvenance: imageEvidence?.provenance ?? null,
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
        freeSemanticProposalMode: true,
        catalogSentToProvider: false,
        actorRecognitionExamplesSentToProvider: false,
        serverLeafResolutionAfterProvider: true,
      },
      toolPermissions: [],
      contextMetadata: {
        activityEventId: activity.id,
        reviewBeforeFactCommit: true,
        minimumProposalCount: MIN_PROPOSALS,
        providerCatalogSent: false,
        serverLeafResolutionRequired: true,
        imageEvidencePresent: Boolean(imageEvidence),
        imageMeasurementsAllowed: false,
      },
    });

    const contextGuardInputTokenEstimate =
      estimateInputTokensForContextGuard({
        system: compiled.systemPrompt,
        user: compiled.requestPayload,
        schema,
      });

    if (contextGuardInputTokenEstimate > INPUT_TOKEN_CEILING) {
      throw new Error(
        `AI_A3_1_SEMANTIC_REVIEW_INPUT_TOO_LARGE:${contextGuardInputTokenEstimate}`,
      );
    }

    const budgetInputTokenUpperBound =
      estimateInputTokensForBudgetUpperBound({
        system: compiled.systemPrompt,
        user: compiled.requestPayload,
        schema,
      });

    const reservation = await reserveBudget({
      userId: input.appUserId,
      operationId,
      tierCode: model.tierCode,
      modelName: model.modelName,
      estimatedInputTokens: budgetInputTokenUpperBound,
    });

    usageEventId = await createUsageEvent({
      userId: input.appUserId,
      analysisExecutionId,
      operationId,
      tierCode: model.tierCode,
      modelName: model.modelName,
      reservation,
      estimatedInputTokens: budgetInputTokenUpperBound,
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
      userImageDataUrl,
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

    const validatedModelMeasurements = validateModelMeasurements(
      response.parsed.measurements,
    );
    const modelMeasurements = imageEvidence
      ? filterImageMeasurementsToDeclaredText({
          measurements: validatedModelMeasurements,
          declaredText: asText(activityMetadata.quickCaptureSourceMessageText),
        })
      : validatedModelMeasurements;

    const measurements = ensureUniversalMeasurements({
      measurements: modelMeasurements,
      activity,
    });

    const proposals = validateModelProposals(
      response.parsed.proposals,
    );

    await markAiContextManifestValidated(manifestId, {
      passed: true,
      contract: AI_A3_1_SEMANTIC_REVIEW_CONTRACT,
      measurementCount: measurements.length,
      proposalCount: proposals.length,
      primaryCount: proposals.filter((row) => row.isPrimary).length,
      proposalKind: "semantic_proposal",
      allProposalsAreExistingLeaves: false,
      providerCatalogSent: false,
      serverLeafResolutionRequired: true,
      minimumSevenAdditionalProposals: proposals.length >= 8,
      factsWritten: false,
      imageEvidencePresent: Boolean(imageEvidence),
      imageMeasurementsAllowed: false,
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
