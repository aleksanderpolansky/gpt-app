import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
import { supabase } from "../../../../../../lib/supabase";
import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
import {
  resolveCategoryCandidates,
  type CategoryResolverCreatePolicy,
  type CategoryResolverSupabaseClient,
} from "../../../../../../lib/activity/categoryDerivation/resolver";
import {
  persistCategoryDerivations,
  type CategoryDerivationPersistenceSupabaseClient,
} from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
import type { AdditionalValueObjectCategoryLink } from "../../../../../../lib/activity/valueObjectBridge";

export const dynamic = "force-dynamic";

type FreeTextValueObjectTestBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  enableCategoryDerivation?: unknown;
  categoryDerivationEnabled?: unknown;
  categoryDerivation?: unknown;
  categoryDerivationDryRun?: unknown;
  categoryDerivationCreatePolicy?: unknown;
};

type CategoryDerivationRouteOptions = {
  enabled: boolean;
  dryRun: boolean;
  createPolicy: CategoryResolverCreatePolicy;
};

type CategoryDerivationRouteResult = {
  enabled: boolean;
  ok: boolean | null;
  skipped: boolean;
  reason?: string | null;
  error?: string | null;
  options: CategoryDerivationRouteOptions;
  extraction?: {
    ok: boolean;
    skipped: boolean;
    skipReason: string | null;
    processorVersion: string;
    ruleVersion: string | null;
    confidence: number | null;
    candidateCount: number;
    warnings: string[];
    errors: string[];
    candidates: unknown[];
  };
  resolution?: {
    ok: boolean;
    createdCount: number;
    reusedCount: number;
    unresolvedCount: number;
    warnings: string[];
    errors: string[];
    candidates: unknown[];
  };
  persistence?: {
    ok: boolean;
    derivationRunId: string | null;
    derivationRowsCreated: number;
    candidateCount: number;
    resolvedCandidateCount: number;
    unresolvedCandidateCount: number;
    warnings: string[];
    errors: string[];
  };
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function resolveCategoryDerivationOptions(
  body: FreeTextValueObjectTestBody
):
  | { ok: true; options: CategoryDerivationRouteOptions }
  | { ok: false; error: string } {
  const enabled =
    asBoolean(body.enableCategoryDerivation) ??
    asBoolean(body.categoryDerivationEnabled) ??
    asBoolean(body.categoryDerivation) ??
    false;

  const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;

  const rawCreatePolicy =
    asString(body.categoryDerivationCreatePolicy) ?? "suggested_only";

  const allowedPolicies: CategoryResolverCreatePolicy[] = [
    "never",
    "suggested_only",
    "active_for_confirmed_required",
  ];

  if (!allowedPolicies.includes(rawCreatePolicy as CategoryResolverCreatePolicy)) {
    return {
      ok: false,
      error:
        "categoryDerivationCreatePolicy must be one of: never, suggested_only, active_for_confirmed_required.",
    };
  }

  return {
    ok: true,
    options: {
      enabled,
      dryRun,
      createPolicy: rawCreatePolicy as CategoryResolverCreatePolicy,
    },
  };
}

function resolveTiming(body: FreeTextValueObjectTestBody) {
  const durationMinutes = asNumber(body.durationMinutes) ?? 15;

  if (durationMinutes < 0) {
    return {
      ok: false as const,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  const rawStartedAt = asString(body.startedAt);
  const rawEndedAt = asString(body.endedAt);

  if (rawStartedAt && rawEndedAt) {
    const startedDate = new Date(rawStartedAt);
    const endedDate = new Date(rawEndedAt);

    if (
      Number.isNaN(startedDate.getTime()) ||
      Number.isNaN(endedDate.getTime())
    ) {
      return {
        ok: false as const,
        error: "Invalid startedAt or endedAt.",
      };
    }

    if (endedDate.getTime() < startedDate.getTime()) {
      return {
        ok: false as const,
        error: "endedAt must be greater than or equal to startedAt.",
      };
    }

    return {
      ok: true as const,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: Math.round(
        (endedDate.getTime() - startedDate.getTime()) / 60000
      ),
    };
  }

  if (rawStartedAt) {
    const startedDate = new Date(rawStartedAt);

    if (Number.isNaN(startedDate.getTime())) {
      return {
        ok: false as const,
        error: "Invalid startedAt.",
      };
    }

    const endedDate = new Date(startedDate.getTime() + durationMinutes * 60000);

    return {
      ok: true as const,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes,
    };
  }

  const endedDate = rawEndedAt ? new Date(rawEndedAt) : new Date();

  if (Number.isNaN(endedDate.getTime())) {
    return {
      ok: false as const,
      error: "Invalid endedAt.",
    };
  }

  const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);

  return {
    ok: true as const,
    startedAt: startedDate.toISOString(),
    endedAt: endedDate.toISOString(),
    durationMinutes,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuidLike(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function readStringField(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function readNumberField(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function collectPossibleResolvedCandidates(
  categoryDerivationResult: unknown
): Record<string, unknown>[] {
  if (!isRecord(categoryDerivationResult)) {
    return [];
  }

  const direct = readObjectArray(categoryDerivationResult.resolvedCandidates);

  if (direct.length > 0) {
    return direct;
  }

  const resolution = isRecord(categoryDerivationResult.resolution)
    ? categoryDerivationResult.resolution
    : null;

  if (resolution) {
    const fromResolution = readObjectArray(resolution.resolvedCandidates);

    if (fromResolution.length > 0) {
      return fromResolution;
    }

    const fromResolutionCandidates = readObjectArray(resolution.candidates);

    if (fromResolutionCandidates.length > 0) {
      return fromResolutionCandidates;
    }
  }

  const result = isRecord(categoryDerivationResult.result)
    ? categoryDerivationResult.result
    : null;

  if (result) {
    const fromResult = readObjectArray(result.resolvedCandidates);

    if (fromResult.length > 0) {
      return fromResult;
    }
  }

  return [];
}

function collectPossibleDerivationRows(
  categoryDerivationResult: unknown
): Record<string, unknown>[] {
  if (!isRecord(categoryDerivationResult)) {
    return [];
  }

  const direct = readObjectArray(categoryDerivationResult.activityCategoryDerivations);

  if (direct.length > 0) {
    return direct;
  }

  const persistence = isRecord(categoryDerivationResult.persistence)
    ? categoryDerivationResult.persistence
    : null;

  if (persistence) {
    const fromPersistence = readObjectArray(
      persistence.activityCategoryDerivations
    );

    if (fromPersistence.length > 0) {
      return fromPersistence;
    }

    const fromRows = readObjectArray(persistence.rows);

    if (fromRows.length > 0) {
      return fromRows;
    }
  }

  return [];
}

function buildDerivationRowBySlug(
  rows: Record<string, unknown>[]
): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const slug = readStringField(row, [
      "candidateSlug",
      "candidate_slug",
      "categorySlug",
      "category_slug",
      "slug",
    ]);

    if (slug) {
      result.set(slug, row);
    }
  }

  return result;
}

function buildAdditionalCategoryLinksForBridge(params: {
  categoryDerivationEnabled: boolean;
  categoryDerivationDryRun: boolean;
  activityEventId: string;
  derivationRunId: string | null;
  categoryDerivationResult: unknown;
}): AdditionalValueObjectCategoryLink[] | undefined {
  const {
    categoryDerivationEnabled,
    categoryDerivationDryRun,
    activityEventId,
    derivationRunId,
    categoryDerivationResult,
  } = params;

  if (!categoryDerivationEnabled || categoryDerivationDryRun) {
    return undefined;
  }

  const resolvedCandidates =
    collectPossibleResolvedCandidates(categoryDerivationResult);
  const derivationRowsBySlug = buildDerivationRowBySlug(
    collectPossibleDerivationRows(categoryDerivationResult)
  );

  const allowedResolutionStatuses = new Set([
    "resolved_existing",
    "created_suggested",
    "created_active",
  ]);

  const links: AdditionalValueObjectCategoryLink[] = [];

  for (const candidate of resolvedCandidates) {
    const categoryId = readStringField(candidate, [
      "categoryId",
      "category_id",
      "resolvedCategoryId",
      "resolved_category_id",
    ]);

    if (!isUuidLike(categoryId)) {
      continue;
    }

    const resolutionStatus =
      readStringField(candidate, ["resolutionStatus", "resolution_status"]) ??
      "resolved_existing";

    if (!allowedResolutionStatuses.has(resolutionStatus)) {
      continue;
    }

    const candidateSlug =
      readStringField(candidate, [
        "candidateSlug",
        "candidate_slug",
        "categorySlug",
        "category_slug",
        "slug",
      ]) ?? categoryId;

    const derivationRow = derivationRowsBySlug.get(candidateSlug) ?? null;

    const activityCategoryDerivationId = derivationRow
      ? readStringField(derivationRow, ["id", "activityCategoryDerivationId"])
      : null;

    links.push({
      categoryId,
      categoryTable: "contextual_categories",
      categoryRole: "semantic_component",
      source: "rule",
      confidence:
        readNumberField(candidate, ["confidence", "score"]) ??
        readNumberField(derivationRow ?? {}, ["confidence", "score"]),
      derivationRunId,
      activityCategoryDerivationId,
      activityEventId,
      candidateSlug,
      candidateTitle: readStringField(candidate, [
        "candidateTitle",
        "candidate_title",
        "title",
        "label",
        "name",
      ]),
      semanticLayer: readStringField(candidate, [
        "semanticLayer",
        "semantic_layer",
      ]),
      categoryType: readStringField(candidate, ["categoryType", "category_type"]),
      resolutionStatus,
      metadata: {
        sourceLayer: "category_derivation",
        sourceRoute: "/api/activity/debug/free-text-value-object-test",
        p4Step: "P4.10.0-C8-P3-B5-B3",
      },
    });
  }

  return links.length > 0 ? links : undefined;
}
async function runCategoryDerivationForDebugRoute(params: {
  activityEventId: string;
  inputText: string;
  title: string | null;
  description: string | null;
  durationMinutes: number;
  personActorId: string;
  options: CategoryDerivationRouteOptions;
}): Promise<CategoryDerivationRouteResult> {
  const { options } = params;

  if (!options.enabled) {
    return {
      enabled: false,
      ok: null,
      skipped: true,
      reason: "feature_flag_disabled",
      options,
    };
  }

  try {
    const derivationInput: CategoryDerivationInput = {
      activityEventId: params.activityEventId,
      inputText: params.inputText,
      title: params.title,
      description: params.description,
      durationMinutes: params.durationMinutes,
      inputLanguage: null,
      actorId: params.personActorId,
      organizationId: null,
      metadata: {
        endpoint: "/api/activity/debug/free-text-value-object-test",
        p4Step: "P4.10.0-C8-O1",
        featureFlag: "categoryDerivation",
      },
    };

    const extractionResult = deriveCategoryCandidates(derivationInput);

    const resolutionResult = await resolveCategoryCandidates(
      supabase as unknown as CategoryResolverSupabaseClient,
      extractionResult.candidates,
      {
        createPolicy: options.createPolicy,
        dryRun: options.dryRun,
        sourceType: "rule",
        defaultCategoryType: "derived",
      }
    );

    const persistenceResult = await persistCategoryDerivations(
      supabase as unknown as CategoryDerivationPersistenceSupabaseClient,
      {
        activityEventId: params.activityEventId,
        input: derivationInput,
        derivationResult: extractionResult,
        resolvedCandidates: resolutionResult.candidates,
        actorId: params.personActorId,
        organizationId: null,
        modelName: null,
        promptVersion: null,
        needsUserConfirmation:
          resolutionResult.unresolvedCount > 0 ||
          extractionResult.candidates.some((candidate) =>
            Boolean(candidate.needsUserReview)
          ),
      }
    );

    const ok =
      extractionResult.ok && resolutionResult.ok && persistenceResult.ok;

    return {
      enabled: true,
      ok,
      skipped: false,
      options,
      extraction: {
        ok: extractionResult.ok,
        skipped: extractionResult.skipped ?? false,
        skipReason: extractionResult.skipReason ?? null,
        processorVersion: extractionResult.processorVersion,
        ruleVersion: extractionResult.ruleVersion ?? null,
        confidence: extractionResult.confidence ?? null,
        candidateCount: extractionResult.candidates.length,
        warnings: extractionResult.warnings,
        errors: extractionResult.errors,
        candidates: extractionResult.candidates,
      },
      resolution: {
        ok: resolutionResult.ok,
        createdCount: resolutionResult.createdCount,
        reusedCount: resolutionResult.reusedCount,
        unresolvedCount: resolutionResult.unresolvedCount,
        warnings: resolutionResult.warnings,
        errors: resolutionResult.errors,
        candidates: resolutionResult.candidates,
      },
      persistence: {
        ok: persistenceResult.ok,
        derivationRunId: persistenceResult.derivationRunId,
        derivationRowsCreated: persistenceResult.derivationRowsCreated,
        candidateCount: persistenceResult.candidateCount,
        resolvedCandidateCount: persistenceResult.resolvedCandidateCount,
        unresolvedCandidateCount: persistenceResult.unresolvedCandidateCount,
        warnings: persistenceResult.warnings,
        errors: persistenceResult.errors,
      },
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
      options,
    };
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/free-text-value-object-test",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    categoryDerivation: {
      available: true,
      defaultEnabled: false,
      enableFlag: "enableCategoryDerivation",
      dryRunFlag: "categoryDerivationDryRun",
      createPolicyField: "categoryDerivationCreatePolicy",
      createPolicyValues: [
        "never",
        "suggested_only",
        "active_for_confirmed_required",
      ],
    },
    example: {
      inputText: "walked to work for 15 minutes",
      durationMinutes: 15,
      title: "Walked to work",
      enableCategoryDerivation: true,
      categoryDerivationCreatePolicy: "suggested_only",
      categoryDerivationDryRun: false,
    },
  });
}

export async function POST(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  let body: FreeTextValueObjectTestBody;

  try {
    body = (await request.json()) as FreeTextValueObjectTestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const userContext = await getActivityUserContext();
  const { appUser, personActor } = userContext;

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authenticated app user and person actor context are required.",
      },
      { status: 401 }
    );
  }

  const inputText = asString(body.inputText) ?? asString(body.naturalInput);

  if (!inputText) {
    return NextResponse.json(
      {
        ok: false,
        error: "inputText or naturalInput is required.",
      },
      { status: 400 }
    );
  }

  const timing = resolveTiming(body);

  if (!timing.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: timing.error,
      },
      { status: 400 }
    );
  }

  const categoryDerivationOptionsResult =
    resolveCategoryDerivationOptions(body);

  if (!categoryDerivationOptionsResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: categoryDerivationOptionsResult.error,
      },
      { status: 400 }
    );
  }

  const categoryDerivationOptions = categoryDerivationOptionsResult.options;
  const processingRunId = randomUUID();
  const processingStartedAt = new Date();
  const nowIso = new Date().toISOString();
  const title = asString(body.title) ?? "Free-text activity test";
  const description = asString(body.description);

  const { data: createdEventData, error: createError } = await supabase
    .from("activity_events")
    .insert({
      user_id: appUser.id,
      performed_by_actor_id: personActor.id,
      acting_as_actor_id: personActor.id,
      acting_for_actor_id: null,
      activity_type_id: null,
      activity_template_id: null,
      template_id: null,
      event_code: null,
      input_text: inputText,
      title,
      description,
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      source: "manual_chat",
      status: "completed",
      privacy_scope: "private",
      processing_status: "processed",
      metadata_json: {
        parser: "debug_free_text_value_object_test_v1",
        p4Step: "P4.10.0-C8-O1",
        freeTextValueObjectTest: true,
        categoryDerivationEnabled: categoryDerivationOptions.enabled,
        categoryDerivationDryRun: categoryDerivationOptions.dryRun,
        categoryDerivationCreatePolicy: categoryDerivationOptions.createPolicy,
        aiUsed: false,
        createdAt: nowIso,
      },
    })
    .select()
    .single();

  if (createError || !createdEventData) {
    return NextResponse.json(
      {
        ok: false,
        error: createError?.message ?? "Failed to create activity event.",
      },
      { status: 500 }
    );
  }

  const createdEvent = createdEventData as { id: string };

  const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
    activityEventId: createdEvent.id,
    inputText,
    title,
    description,
    durationMinutes: timing.durationMinutes,
    personActorId: personActor.id,
    options: categoryDerivationOptions,
  });

    const categoryDerivationBridgeAdditionalCategoryLinks =
      buildAdditionalCategoryLinksForBridge({
        categoryDerivationEnabled: categoryDerivationOptions.enabled,
        categoryDerivationDryRun: categoryDerivationOptions.dryRun,
        activityEventId: createdEvent.id,
        derivationRunId:
          categoryDerivationResult?.derivationRunId ??
          categoryDerivationResult?.runId ??
          null,
        categoryDerivationResult,
      });
  const bridgeResult = await processActivityValueObjectBridge({
      additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks,
    supabase,
    eventId: createdEvent.id,
    processorName: "activity_debug_free_text_value_object_test",
    allowNonCompletedEvent: false,
  });

  const categoryDerivationWarning =
    categoryDerivationResult.enabled && categoryDerivationResult.ok === false;

  const logResult = await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: null,
    activityEventId: createdEvent.id,
    processingRunId,
    processorName: "activity_debug_free_text_value_object_test",
    processingStage: "finalize",
    processingStatus: bridgeResult.ok
      ? categoryDerivationWarning
        ? "warning"
        : bridgeResult.skipped
          ? "skipped"
          : "completed"
      : "warning",
    severity:
      bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
    message: "Debug free-text Value Object bridge processed.",
    input: {
      eventId: createdEvent.id,
      inputText,
      durationMinutes: timing.durationMinutes,
      categoryDerivation: {
        enabled: categoryDerivationOptions.enabled,
        dryRun: categoryDerivationOptions.dryRun,
        createPolicy: categoryDerivationOptions.createPolicy,
      },
    },
    output: {
      ok: bridgeResult.ok,
      skipped: bridgeResult.skipped,
      skipReason: bridgeResult.skipReason,
      mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
      mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
      bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
      errors: bridgeResult.errors,
      categoryDerivation: {
        enabled: categoryDerivationResult.enabled,
        ok: categoryDerivationResult.ok,
        skipped: categoryDerivationResult.skipped,
        error: categoryDerivationResult.error ?? null,
        extractionCandidateCount:
          categoryDerivationResult.extraction?.candidateCount ?? null,
        resolutionCreatedCount:
          categoryDerivationResult.resolution?.createdCount ?? null,
        resolutionReusedCount:
          categoryDerivationResult.resolution?.reusedCount ?? null,
        resolutionUnresolvedCount:
          categoryDerivationResult.resolution?.unresolvedCount ?? null,
        derivationRunId:
          categoryDerivationResult.persistence?.derivationRunId ?? null,
        derivationRowsCreated:
          categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
      },
    },
    metadata: {
      endpoint: "/api/activity/debug/free-text-value-object-test",
      p4Step: "P4.10.0-C8-O1",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: new Date().getTime() - processingStartedAt.getTime(),
  });

  const responseOk =
    bridgeResult.ok &&
    (!categoryDerivationResult.enabled || categoryDerivationResult.ok !== false);

  return NextResponse.json({
    ok: responseOk,
    status: bridgeResult.ok
      ? bridgeResult.skipped
        ? "created_but_bridge_skipped"
        : "created_and_bridge_processed"
      : "created_but_bridge_failed",
    event: createdEventData,
    categoryDerivation: categoryDerivationResult,
    valueObjectBridge: {
      ok: bridgeResult.ok,
      skipped: bridgeResult.skipped,
      skipReason: bridgeResult.skipReason,
      errors: bridgeResult.errors,
      mapping: bridgeResult.mappingResult
        ? {
            ok: bridgeResult.mappingResult.ok,
            skipped: bridgeResult.mappingResult.skipped,
            skipReason: bridgeResult.mappingResult.skipReason,
            classificationSummaryCount:
              bridgeResult.mappingResult.classificationSummary.length,
            mappingsCount: bridgeResult.mappingResult.mappings.length,
            mappings: bridgeResult.mappingResult.mappings,
          }
        : null,
      bridge: bridgeResult.bridgeResult
        ? {
            ok: bridgeResult.bridgeResult.ok,
            skipped: bridgeResult.bridgeResult.skipped,
            skipReason: bridgeResult.bridgeResult.skipReason,
            mappingsRequested: bridgeResult.bridgeResult.mappingsRequested,
            createdCount: bridgeResult.bridgeResult.created.length,
            created: bridgeResult.bridgeResult.created,
            errors: bridgeResult.bridgeResult.errors,
          }
        : null,
    },
    processingLogs: {
      processingRunId,
      valueObjectBridge: {
        ok: logResult.ok,
        error: logResult.error,
        logId: logResult.log?.id ?? null,
      },
    },
  });
}