import crypto from "node:crypto";
import { Buffer } from "node:buffer";

import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonUsageMetadata,
} from "../../../lib/ai/openaiClient";
import { supabase } from "../../../lib/supabase";
import {
  completeAiAnalysisExecution,
  createAiAnalysisExecution,
  createAiContextManifest,
  failAiAnalysisExecution,
  markAiContextManifestFailed,
  markAiContextManifestProviderCompleted,
  markAiContextManifestValidated,
} from "../../../lib/ai/contextManifest";
import { compileRuntimeContextPackV1 } from "../ai/runtimeContextCompiler.server";
import {
  ARCTOR_CONTENT_LOCALES,
  ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
  normalizeContentLocale,
  normalizeLocalizedContentFields,
  readLocalizedContentEnvelope,
  type ArctorContentLocale,
  type LocalizedContentEnvelope,
  type LocalizedContentFieldMap,
} from "./contentLocalization";

export const ARCTOR_CONTENT_LOCALIZATION_RUNTIME = "ARCTOR_CONTENT_LOCALIZATION_V1" as const;

const ROUTE_PATH = "/api/activity/quick-capture";
const MODEL_TIER = "nano";
const MAX_BATCH_ITEMS = 5;
const MAX_FIELDS_PER_ITEM = 12;
const MAX_TOTAL_SOURCE_CHARS = 12_000;
const MAX_OUTPUT_TOKENS = 2_600;
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_ESTIMATED_INPUT_TOKENS = 20_000;
const FIELD_CODE_RE = /^[a-z][a-zA-Z0-9_]{0,63}$/;

type TranslationInput = {
  key: string;
  fields: LocalizedContentFieldMap;
};

type TranslationOutputField = {
  fieldCode?: unknown;
  variants?: unknown;
};

type TranslationOutputItem = {
  key?: unknown;
  detectedSourceLocale?: unknown;
  fields?: unknown;
};

type TranslationOutput = {
  items?: unknown;
};

type ActivityLocalizationInput = {
  activityEventId: string;
  title: string | null;
  inputText: string | null;
  description?: string | null;
};

type BudgetReservation = {
  reservationId: string;
  priceSnapshotId: string;
  requestedCallMaxCostUsd: number | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sourceRevision(sourceLocaleHint: ArctorContentLocale, fields: LocalizedContentFieldMap) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ sourceLocaleHint, fields }), "utf8")
    .digest("hex");
}

function normalizeInputFields(fields: LocalizedContentFieldMap) {
  const normalized = normalizeLocalizedContentFields(fields);
  const entries = Object.entries(normalized)
    .filter(([fieldCode]) => FIELD_CODE_RE.test(fieldCode))
    .slice(0, MAX_FIELDS_PER_ITEM);
  if (entries.length === 0 || entries.every(([, text]) => !text)) {
    throw new Error("CONTENT_LOCALIZATION_FIELDS_EMPTY");
  }
  return Object.fromEntries(entries) as LocalizedContentFieldMap;
}

function translationSchema(targetLocales: readonly ArctorContentLocale[]) {
  const variantProperties = Object.fromEntries(
    targetLocales.map((locale) => [locale, { type: ["string", "null"] }]),
  );
  return {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: MAX_BATCH_ITEMS,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "detectedSourceLocale", "fields"],
          properties: {
            key: { type: "string" },
            detectedSourceLocale: {
              type: "string",
              enum: [...ARCTOR_CONTENT_LOCALES],
            },
            fields: {
              type: "array",
              minItems: 1,
              maxItems: MAX_FIELDS_PER_ITEM,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["fieldCode", "variants"],
                properties: {
                  fieldCode: { type: "string" },
                  variants: {
                    type: "object",
                    additionalProperties: false,
                    required: [...targetLocales],
                    properties: variantProperties,
                  },
                },
              },
            },
          },
        },
      },
    },
  } as Record<string, unknown>;
}

async function getNanoModel() {
  const { data, error } = await supabase
    .from("ai_model_tiers")
    .select("tier_code,default_model_name,enabled")
    .eq("tier_code", MODEL_TIER)
    .maybeSingle();
  const row = asRecord(data);
  const model = asText(row.default_model_name);
  if (error || row.enabled !== true || !model) {
    throw new Error(`CONTENT_LOCALIZATION_NANO_MODEL_UNAVAILABLE:${error?.message ?? "disabled"}`);
  }
  return model;
}

function estimateInputTokensUpperBound(input: {
  system: string;
  user: unknown;
  schema: Record<string, unknown>;
}) {
  const serialized = input.system + JSON.stringify(input.user) + JSON.stringify(input.schema);
  return Buffer.byteLength(serialized, "utf8") + 1_024;
}

async function reserveBudget(input: {
  userId: string;
  operationId: string;
  model: string;
  estimatedInputTokens: number;
}) {
  const { data, error } = await supabase.rpc("preflight_ai_pilot_call_budget_v1", {
    p_app_user_id: input.userId,
    p_operation_id: input.operationId,
    p_tier_code: MODEL_TIER,
    p_model_name: input.model,
    p_input_tokens: input.estimatedInputTokens,
    p_cached_input_tokens: 0,
    p_max_output_tokens: MAX_OUTPUT_TOKENS,
  });
  if (error) throw new Error(`CONTENT_LOCALIZATION_BUDGET_PREFLIGHT_FAILED:${error.message}`);
  const row = asRecord(data);
  if (row.allowed !== true) {
    throw new Error(`CONTENT_LOCALIZATION_BUDGET_BLOCKED:${asText(row.reason) || "UNKNOWN"}`);
  }
  const reservationId = asText(row.reservationId);
  const priceSnapshotId = asText(row.priceSnapshotId);
  if (!reservationId || !priceSnapshotId) {
    throw new Error("CONTENT_LOCALIZATION_BUDGET_RESERVATION_INVALID");
  }
  return {
    reservationId,
    priceSnapshotId,
    requestedCallMaxCostUsd: asFiniteNumber(row.requestedCallMaxCostUsd),
  } satisfies BudgetReservation;
}

async function createUsageEvent(input: {
  userId: string;
  analysisExecutionId: string;
  operationId: string;
  model: string;
  reservation: BudgetReservation;
  estimatedInputTokens: number;
}) {
  const { data, error } = await supabase
    .from("ai_usage_events")
    .insert({
      app_user_id: input.userId,
      analysis_execution_id: input.analysisExecutionId,
      selected_tier_code: MODEL_TIER,
      model_name: input.model,
      provider: "openai",
      route_path: ROUTE_PATH,
      operation_kind: "content_localization",
      input_tokens: input.estimatedInputTokens,
      cached_input_tokens: 0,
      output_tokens: 0,
      total_tokens: input.estimatedInputTokens,
      status: "preflight_allowed",
      request_metadata: {
        contract: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
        stage: "content_localization",
        walletDebited: false,
        conservativeInputTokenUpperBound: input.estimatedInputTokens,
      },
      response_metadata: {},
      pilot_operation_id: input.operationId,
      pilot_budget_reservation_id: input.reservation.reservationId,
      estimated_provider_cost_usd: input.reservation.requestedCallMaxCostUsd,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(`CONTENT_LOCALIZATION_USAGE_PREFLIGHT_LOG_FAILED:${error?.message ?? "missing id"}`);
  }
  return String(data.id);
}

async function calculateActualProviderCostUsd(input: {
  priceSnapshotId: string;
  usage: RunAiJsonUsageMetadata;
}) {
  const { data, error } = await supabase
    .from("ai_model_price_snapshots")
    .select("input_cost_per_1m_tokens,cached_input_cost_per_1m_tokens,output_cost_per_1m_tokens")
    .eq("id", input.priceSnapshotId)
    .maybeSingle();
  if (error || !data) return null;
  const inputPrice = asFiniteNumber(data.input_cost_per_1m_tokens);
  const cachedPrice = asFiniteNumber(data.cached_input_cost_per_1m_tokens) ?? inputPrice;
  const outputPrice = asFiniteNumber(data.output_cost_per_1m_tokens);
  if (inputPrice === null || cachedPrice === null || outputPrice === null) return null;
  const cachedInput = Math.min(input.usage.inputTokens, input.usage.cachedInputTokens);
  const uncachedInput = Math.max(0, input.usage.inputTokens - cachedInput);
  return (
    uncachedInput * inputPrice +
    cachedInput * cachedPrice +
    input.usage.outputTokens * outputPrice
  ) / 1_000_000;
}

async function finalizeUsageEvent(input: {
  usageEventId: string;
  priceSnapshotId: string;
  usage: RunAiJsonUsageMetadata;
}) {
  const actualProviderCostUsd = await calculateActualProviderCostUsd({
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
      actual_provider_cost_usd: actualProviderCostUsd,
      status: "openai_completed",
      openai_response_id: input.usage.responseId,
      response_metadata: {
        contract: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
        rawUsage: input.usage.rawUsage,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.usageEventId);
  if (error) {
    throw new Error(`CONTENT_LOCALIZATION_USAGE_FINALIZE_FAILED:${error.message}`);
  }
}

async function markUsageFailed(usageEventId: string) {
  await supabase
    .from("ai_usage_events")
    .update({
      status: "openai_failed",
      error_code: "CONTENT_LOCALIZATION_STAGE_FAILED",
      error_message: "Content localization AI stage failed; raw provider output is not stored here.",
      completed_at: new Date().toISOString(),
    })
    .eq("id", usageEventId);
}

function sanitizeTranslatedItem(input: {
  raw: TranslationOutputItem;
  source: TranslationInput;
  sourceLocaleHint: ArctorContentLocale;
  targetLocales: readonly ArctorContentLocale[];
}) {
  const detectedSourceLocale = normalizeContentLocale(input.raw.detectedSourceLocale);
  const fieldsRaw = Array.isArray(input.raw.fields)
    ? (input.raw.fields as TranslationOutputField[])
    : [];
  const expectedCodes = Object.keys(input.source.fields);
  const seen = new Set<string>();
  const variants = Object.fromEntries(
    ARCTOR_CONTENT_LOCALES.map((locale) => [locale, {} as LocalizedContentFieldMap]),
  ) as Record<ArctorContentLocale, LocalizedContentFieldMap>;

  for (const rawField of fieldsRaw) {
    const fieldCode = asText(rawField.fieldCode);
    if (!expectedCodes.includes(fieldCode) || seen.has(fieldCode)) {
      throw new Error(`CONTENT_LOCALIZATION_OUTPUT_FIELD_INVALID:${fieldCode || "EMPTY"}`);
    }
    seen.add(fieldCode);
    const rawVariants = asRecord(rawField.variants);
    for (const locale of input.targetLocales) {
      const value = rawVariants[locale];
      variants[locale][fieldCode] =
        value === null ? null : typeof value === "string" && value.trim() ? value.trim() : null;
    }
  }
  if (seen.size !== expectedCodes.length) {
    throw new Error("CONTENT_LOCALIZATION_OUTPUT_FIELD_COUNT_MISMATCH");
  }

  // The original is immutable evidence. If the detected source locale is trustworthy,
  // show exactly that original when the UI uses the same locale.
  variants[detectedSourceLocale] = { ...input.source.fields };

  return { detectedSourceLocale, sourceLocaleHint: input.sourceLocaleHint, variants };
}

export async function generateLocalizedContentBatch(input: {
  userId: string;
  actorId: string;
  analysisExecutionId?: string | null;
  operationId: string;
  sourceLocaleHint: unknown;
  targetLocales?: ArctorContentLocale[];
  items: TranslationInput[];
}) {
  const sourceLocaleHint = normalizeContentLocale(input.sourceLocaleHint);
  const targetLocales = Array.from(
    new Set(input.targetLocales ?? ARCTOR_CONTENT_LOCALES),
  );
  if (
    targetLocales.length < 1 ||
    targetLocales.some((locale) => !ARCTOR_CONTENT_LOCALES.includes(locale))
  ) {
    throw new Error("CONTENT_LOCALIZATION_TARGET_LOCALES_INVALID");
  }
  const items = input.items.map((item) => ({
    key: item.key.trim(),
    fields: normalizeInputFields(item.fields),
  }));
  if (items.length < 1 || items.length > MAX_BATCH_ITEMS || items.some((item) => !item.key)) {
    throw new Error("CONTENT_LOCALIZATION_BATCH_INVALID");
  }
  if (new Set(items.map((item) => item.key)).size !== items.length) {
    throw new Error("CONTENT_LOCALIZATION_BATCH_DUPLICATE_KEY");
  }
  const totalChars = items.reduce(
    (sum, item) => sum + Object.values(item.fields).reduce((fieldSum, value) => fieldSum + (value?.length ?? 0), 0),
    0,
  );
  if (totalChars > MAX_TOTAL_SOURCE_CHARS) {
    throw new Error("CONTENT_LOCALIZATION_SOURCE_TOO_LARGE");
  }

  const system =
    "Create localized display/search versions of user-authored ARCTor content for every requested locale. Detect the actual source language from the text; the supplied sourceLocaleHint is only a hint. Preserve meaning and tone. Preserve actual person names, brand names, URLs, codes, identifiers, numbers, dates, clock times and units. IMPORTANT: in organizationName and title fields, preserve only the actual proper-name or brand span; translate ordinary descriptive, profession, service and category words around it. Do not treat an entire organizationName or title as a proper name merely because it is a name/title field. Never add facts, explanations, advice or commentary. Return only the required JSON.";
  const user = {
    runtime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
    sourceLocaleHint,
    targetLocales,
    items,
  };
  const schema = translationSchema(targetLocales);
  const model = await getNanoModel();
  const localizationInputText = JSON.stringify({
    sourceLocaleHint,
    items,
  }) ?? "{}";
  const localizationExecutionId = await createAiAnalysisExecution({
    appUserId: input.userId,
    actorId: input.actorId,
    surfaceCode: "content_localization",
    operationKind: "content_localization",
    localeCode: sourceLocaleHint,
    timeZone: "UTC",
    inputText: localizationInputText,
    metadata: {
      contract: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
      parentSemanticExecutionId: input.analysisExecutionId ?? null,
      parentOperationId: input.operationId,
      sourceItemCount: items.length,
      timeZoneSemanticallyRelevant: false,
    },
  });

  let usageEventId: string | null = null;
  let contextManifestId: string | null = null;
  let usageFinalized = false;
  let manifestValidated = false;

  try {
    const compiledContext = await compileRuntimeContextPackV1({
      appUserId: input.userId,
      actorId: input.actorId,
      runtimeCode: "content_localization",
      locale: sourceLocaleHint,
      timeZone: "UTC",
      stageCode: "content_localization",
      stageSequence: 1,
      protocolCode: "ARCTOR_CONTENT_LOCALIZATION",
      protocolVersion: "v1",
      schemaName: "arctor_content_localization_v1",
      schemaVersion: "v1",
      schema,
      provider: "openai",
      modelName: model,
      modelTier: MODEL_TIER,
      storeProviderState: false,
      maxRetries: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      modelConfig: {
        reasoningEffort: "none",
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
        outputTokenCeiling: MAX_OUTPUT_TOKENS,
      },
      embeddedSystemPrompt: system,
      requestPayload: user,
      retrievalSnapshot: {
        sourceItemKeys: items.map((item) => item.key),
        fieldCodesByItem: items.map((item) => ({
          key: item.key,
          fieldCodes: Object.keys(item.fields),
        })),
      },
      embeddedInstructionRefs: [
        {
          kind: "embedded_runtime_instruction",
          code: "CONTENT_LOCALIZATION_V1",
          version: "v1",
        },
      ],
      toolPermissions: [],
      contextMetadata: {
        parentSemanticExecutionId: input.analysisExecutionId ?? null,
        parentOperationId: input.operationId,
        localizationIsIndependentExecution: true,
        rawInputPersistedInManifest: false,
      },
    });

    const estimatedInputTokens = estimateInputTokensUpperBound({
      system: compiledContext.systemPrompt,
      user: compiledContext.requestPayload,
      schema,
    });
    if (estimatedInputTokens > MAX_ESTIMATED_INPUT_TOKENS) {
      throw new Error(`CONTENT_LOCALIZATION_INPUT_TOKEN_LIMIT:${estimatedInputTokens}`);
    }

    const reservation = await reserveBudget({
      userId: input.userId,
      operationId: input.operationId,
      model,
      estimatedInputTokens,
    });
    usageEventId = await createUsageEvent({
      userId: input.userId,
      analysisExecutionId: localizationExecutionId,
      operationId: input.operationId,
      model,
      reservation,
      estimatedInputTokens,
    });
    contextManifestId = await createAiContextManifest({
      analysisExecutionId: localizationExecutionId,
      stageCode: "content_localization",
      stageSequence: 1,
      aiUsageEventId: usageEventId,
      protocolCode: "ARCTOR_CONTENT_LOCALIZATION",
      protocolVersion: "v1",
      schemaName: "arctor_content_localization_v1",
      schemaVersion: "v1",
      schema,
      systemPrompt: compiledContext.systemPrompt,
      requestPayload: compiledContext.requestPayload,
      provider: "openai",
      modelName: model,
      modelTier: MODEL_TIER,
      storeProviderState: false,
      maxRetries: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      instructionRefs: compiledContext.instructionRefs,
      retrievalSnapshot: compiledContext.retrievalSnapshot,
      toolPermissions: compiledContext.toolPermissions,
      modelConfig: {
        reasoningEffort: "none",
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
        outputTokenCeiling: MAX_OUTPUT_TOKENS,
      },
      contextMetadata: compiledContext.contextMetadata,
    });

    const response = await runAiJsonWithUsageMetadata<TranslationOutput>({
      model,
      reasoningEffort: "none",
      maxRetries: 0,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      outputTokenCeiling: MAX_OUTPUT_TOKENS,
      store: false,
      system: compiledContext.systemPrompt,
      user: compiledContext.requestPayload,
      structuredOutput: {
        name: "arctor_content_localization_v1",
        strict: true,
        schema,
      },
    });
    await markAiContextManifestProviderCompleted(
      contextManifestId,
      response.outputText,
    );

    await finalizeUsageEvent({
      usageEventId,
      priceSnapshotId: reservation.priceSnapshotId,
      usage: response.usage,
    });
    usageFinalized = true;

    const outputItems = Array.isArray(response.parsed?.items)
      ? (response.parsed.items as TranslationOutputItem[])
      : [];
    if (outputItems.length !== items.length) {
      throw new Error("CONTENT_LOCALIZATION_OUTPUT_COUNT_MISMATCH");
    }
    const byKey = new Map<string, TranslationOutputItem>();
    for (const row of outputItems) {
      const key = asText(row.key);
      if (!key || byKey.has(key)) throw new Error("CONTENT_LOCALIZATION_OUTPUT_KEY_INVALID");
      byKey.set(key, row);
    }

    const envelopes = new Map<string, LocalizedContentEnvelope>();
    for (const source of items) {
      const raw = byKey.get(source.key);
      if (!raw) throw new Error(`CONTENT_LOCALIZATION_OUTPUT_KEY_MISSING:${source.key}`);
      const sanitized = sanitizeTranslatedItem({
        raw,
        source,
        sourceLocaleHint,
        targetLocales,
      });
      envelopes.set(source.key, {
        schemaVersion: ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
        detectedSourceLocale: sanitized.detectedSourceLocale,
        sourceLocaleHint,
        sourceRevision: sourceRevision(sourceLocaleHint, source.fields),
        fieldCodes: Object.keys(source.fields),
        original: { ...source.fields },
        variants: sanitized.variants,
        humanLocales: [],
        lastEditedLocale: null,
        generatedAt: new Date().toISOString(),
        provider: "openai",
        model,
        responseId: response.usage.responseId,
        usage: {
          inputTokens: response.usage.inputTokens,
          cachedInputTokens: response.usage.cachedInputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
        },
      });
    }

    await markAiContextManifestValidated(contextManifestId, {
      passed: true,
      validator: "sanitizeTranslatedItem",
      itemCount: items.length,
      localizedFieldCount: items.reduce(
        (sum, item) => sum + Object.keys(item.fields).length,
        0,
      ),
      actorGuidanceApplied: false,
    });
    manifestValidated = true;
    await completeAiAnalysisExecution(localizationExecutionId);

    return {
      envelopes,
      usage: response.usage,
      model,
      analysisExecutionId: localizationExecutionId,
    };
  } catch (error) {
    if (contextManifestId && !manifestValidated) {
      await markAiContextManifestFailed(contextManifestId, error).catch(() => undefined);
    }
    if (usageEventId && !usageFinalized) {
      await markUsageFailed(usageEventId);
    }
    await failAiAnalysisExecution(localizationExecutionId, error);
    throw error;
  }
}


type LocalizableEntityTable = "organizations" | "offers" | "activity_events" | "value_objects";

function cloneVariants(
  fieldCodes: string[],
  source?: Record<ArctorContentLocale, LocalizedContentFieldMap> | null,
) {
  return Object.fromEntries(
    ARCTOR_CONTENT_LOCALES.map((locale) => [
      locale,
      Object.fromEntries(
        fieldCodes.map((fieldCode) => [fieldCode, source?.[locale]?.[fieldCode] ?? null]),
      ),
    ]),
  ) as Record<ArctorContentLocale, LocalizedContentFieldMap>;
}

function normalizeEnvelopeFields(
  fieldCodes: string[],
  fields: LocalizedContentFieldMap,
) {
  return Object.fromEntries(
    fieldCodes.map((fieldCode) => [fieldCode, fields[fieldCode] ?? null]),
  ) as LocalizedContentFieldMap;
}

function createHumanEnvelope(input: {
  existing: LocalizedContentEnvelope | null;
  locale: ArctorContentLocale;
  fields: LocalizedContentFieldMap;
}) {
  const fields = normalizeInputFields(input.fields);
  const fieldCodes = Array.from(
    new Set([...(input.existing?.fieldCodes ?? []), ...Object.keys(fields)]),
  );
  const variants = cloneVariants(fieldCodes, input.existing?.variants ?? null);
  variants[input.locale] = {
    ...variants[input.locale],
    ...fields,
  };
  const humanLocales = Array.from(
    new Set([...(input.existing?.humanLocales ?? []), input.locale]),
  );
  const revisionFields = normalizeEnvelopeFields(fieldCodes, variants[input.locale]);

  return {
    schemaVersion: ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
    detectedSourceLocale: input.existing?.detectedSourceLocale ?? input.locale,
    sourceLocaleHint: input.locale,
    sourceRevision: sourceRevision(input.locale, revisionFields),
    fieldCodes,
    original: {
      ...(input.existing?.original ?? {}),
      ...fields,
    },
    variants,
    humanLocales,
    lastEditedLocale: input.locale,
    generatedAt: new Date().toISOString(),
    provider: input.existing?.provider ?? "human",
    model: input.existing?.model ?? null,
    responseId: input.existing?.responseId ?? null,
    usage: input.existing?.usage ?? {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
  } satisfies LocalizedContentEnvelope;
}

function mergeGeneratedEnvelope(input: {
  generated: LocalizedContentEnvelope;
  protectedEnvelope: LocalizedContentEnvelope | null;
  manualLocale?: ArctorContentLocale | null;
  manualFields?: LocalizedContentFieldMap | null;
}) {
  const fieldCodes = Array.from(
    new Set([...(input.protectedEnvelope?.fieldCodes ?? []), ...input.generated.fieldCodes]),
  );
  const variants = cloneVariants(fieldCodes, input.protectedEnvelope?.variants ?? null);
  const generatedFields = new Set(input.generated.fieldCodes);
  const protectedLocales = new Set<ArctorContentLocale>(
    input.protectedEnvelope?.humanLocales ?? [],
  );

  if (input.manualLocale) {
    protectedLocales.add(input.manualLocale);
  }

  for (const locale of ARCTOR_CONTENT_LOCALES) {
    if (protectedLocales.has(locale)) continue;
    for (const fieldCode of generatedFields) {
      variants[locale][fieldCode] = input.generated.variants[locale]?.[fieldCode] ?? null;
    }
  }

  for (const locale of protectedLocales) {
    const protectedFields = {
      ...(input.protectedEnvelope?.variants[locale] ?? {}),
      ...(input.manualLocale === locale && input.manualFields ? input.manualFields : {}),
    };
    variants[locale] = normalizeEnvelopeFields(fieldCodes, protectedFields);
  }

  return {
    ...input.generated,
    fieldCodes,
    original: {
      ...(input.protectedEnvelope?.original ?? {}),
      ...input.generated.original,
    },
    variants,
    humanLocales: Array.from(protectedLocales),
    lastEditedLocale:
      input.manualLocale ?? input.protectedEnvelope?.lastEditedLocale ?? null,
  } satisfies LocalizedContentEnvelope;
}

async function readEntityMetadata(input: {
  table: LocalizableEntityTable;
  entityId: string;
}) {
  const { data, error } = await supabase
    .from(input.table)
    .select("id,metadata_json")
    .eq("id", input.entityId)
    .single();
  if (error || !data) {
    throw new Error(
      `CONTENT_LOCALIZATION_ENTITY_READ_FAILED:${input.table}:${error?.message ?? "not_found"}`,
    );
  }
  return asRecord((data as Record<string, unknown>).metadata_json);
}

async function writeEntityMetadata(input: {
  table: LocalizableEntityTable;
  entityId: string;
  metadata: JsonRecord;
}) {
  const { error } = await supabase
    .from(input.table)
    .update({ metadata_json: input.metadata })
    .eq("id", input.entityId);
  if (error) {
    throw new Error(
      `CONTENT_LOCALIZATION_ENTITY_UPDATE_FAILED:${input.table}:${error.message}`,
    );
  }
}

export async function localizeEntityContent(input: {
  userId: string;
  actorId: string;
  analysisExecutionId?: string | null;
  operationId?: string | null;
  table: LocalizableEntityTable;
  entityId: string;
  sourceLocaleHint: unknown;
  fields: LocalizedContentFieldMap;
}) {
  const locale = normalizeContentLocale(input.sourceLocaleHint);
  const fields = normalizeInputFields(input.fields);
  const metadata = await readEntityMetadata({
    table: input.table,
    entityId: input.entityId,
  });
  const existing = readLocalizedContentEnvelope(metadata);
  const humanEnvelope = createHumanEnvelope({
    existing,
    locale,
    fields,
  });

  await writeEntityMetadata({
    table: input.table,
    entityId: input.entityId,
    metadata: {
      ...metadata,
      localizedContent: humanEnvelope,
      contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
    },
  });

  try {
    const generated = await generateLocalizedContentBatch({
      userId: input.userId,
      actorId: input.actorId,
      analysisExecutionId: input.analysisExecutionId ?? null,
      operationId: input.operationId?.trim() || crypto.randomUUID(),
      sourceLocaleHint: locale,
      items: [{ key: input.entityId, fields }],
    });
    const generatedEnvelope = generated.envelopes.get(input.entityId);
    if (!generatedEnvelope) {
      throw new Error("CONTENT_LOCALIZATION_ENTITY_RESULT_MISSING");
    }
    const merged = mergeGeneratedEnvelope({
      generated: generatedEnvelope,
      protectedEnvelope: humanEnvelope,
      manualLocale: locale,
      manualFields: fields,
    });
    await writeEntityMetadata({
      table: input.table,
      entityId: input.entityId,
      metadata: {
        ...metadata,
        localizedContent: merged,
        contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
      },
    });
    return {
      ok: true as const,
      manualPersisted: true as const,
      aiLocalized: true as const,
      locale,
      warning: null,
    };
  } catch (error) {
    return {
      ok: true as const,
      manualPersisted: true as const,
      aiLocalized: false as const,
      locale,
      warning:
        error instanceof Error ? error.message : "CONTENT_LOCALIZATION_AI_FAILED",
    };
  }
}

export async function persistHumanLocalizedEntityContent(input: {
  table: LocalizableEntityTable;
  entityId: string;
  sourceLocaleHint: unknown;
  fields: LocalizedContentFieldMap;
}) {
  const locale = normalizeContentLocale(input.sourceLocaleHint);
  const fields = normalizeInputFields(input.fields);
  const metadata = await readEntityMetadata({ table: input.table, entityId: input.entityId });
  const existing = readLocalizedContentEnvelope(metadata);
  const humanEnvelope = createHumanEnvelope({ existing, locale, fields });
  await writeEntityMetadata({
    table: input.table,
    entityId: input.entityId,
    metadata: { ...metadata, localizedContent: humanEnvelope, contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME },
  });
  return { ok: true as const, manualPersisted: true as const, aiLocalized: false as const, locale, warning: null };
}

// CONTENT_L10_LOCALE_ADDRESS_CURRENCY_MEDIA_HOTFIX_V6: manual locale edits are isolated; AI generation remains creation-time behavior.
export async function ensureActivityEventLocalizations(input: {
  userId: string;
  actorId: string;
  analysisExecutionId?: string | null;
  operationId: string;
  sourceLocaleHint: unknown;
  activities: ActivityLocalizationInput[];
}) {
  const sourceLocaleHint = normalizeContentLocale(input.sourceLocaleHint);
  const unique = Array.from(
    new Map(input.activities.map((item) => [item.activityEventId, item])).values(),
  ).slice(0, MAX_BATCH_ITEMS);
  if (unique.length === 0) return { localized: 0, skipped: 0, warnings: [] as string[] };

  const ids = unique.map((item) => item.activityEventId);
  const { data, error } = await supabase
    .from("activity_events")
    .select("id,user_id,acting_as_actor_id,title,input_text,description,metadata_json")
    .eq("user_id", input.userId)
    .eq("acting_as_actor_id", input.actorId)
    .in("id", ids);
  if (error) throw new Error(`CONTENT_LOCALIZATION_ACTIVITY_READ_FAILED:${error.message}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const rowById = new Map(rows.map((row) => [String(row.id), row]));
  const pending: TranslationInput[] = [];
  let skipped = 0;

  for (const item of unique) {
    const row = rowById.get(item.activityEventId);
    if (!row) continue;
    const fields = normalizeInputFields({
      title: item.title ?? (typeof row.title === "string" ? row.title : null),
      inputText: item.inputText ?? (typeof row.input_text === "string" ? row.input_text : null),
      description: item.description ?? (typeof row.description === "string" ? row.description : null),
    });
    const revision = sourceRevision(sourceLocaleHint, fields);
    const existing = readLocalizedContentEnvelope(row.metadata_json);
    if (existing?.sourceRevision === revision) {
      skipped += 1;
      continue;
    }
    pending.push({ key: item.activityEventId, fields });
  }

  if (pending.length === 0) return { localized: 0, skipped, warnings: [] as string[] };

  const generated = await generateLocalizedContentBatch({
    userId: input.userId,
    actorId: input.actorId,
    analysisExecutionId: input.analysisExecutionId ?? null,
    operationId: input.operationId,
    sourceLocaleHint,
    items: pending,
  });
  const warnings: string[] = [];
  let localized = 0;

  for (const source of pending) {
    const row = rowById.get(source.key);
    const envelope = generated.envelopes.get(source.key);
    if (!row || !envelope) {
      warnings.push(`CONTENT_LOCALIZATION_ACTIVITY_RESULT_MISSING:${source.key}`);
      continue;
    }
    const metadata = asRecord(row.metadata_json);
    const existing = readLocalizedContentEnvelope(row.metadata_json);
    const mergedEnvelope = mergeGeneratedEnvelope({
      generated: envelope,
      protectedEnvelope: existing,
      manualLocale: envelope.detectedSourceLocale,
      manualFields: source.fields,
    });
    const { error: updateError } = await supabase
      .from("activity_events")
      .update({
        metadata_json: {
          ...metadata,
          localizedContent: mergedEnvelope,
          contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.key)
      .eq("user_id", input.userId)
      .eq("acting_as_actor_id", input.actorId);
    if (updateError) {
      warnings.push(`CONTENT_LOCALIZATION_ACTIVITY_UPDATE_FAILED:${source.key}:${updateError.message}`);
      continue;
    }
    localized += 1;
  }

  return { localized, skipped, warnings };
}
