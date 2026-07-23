import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import {
  ACTIVITY_COMPLETABLE_STATUSES,
  ACTIVITY_STATUS_COMPLETED,
  canTransitionActivityStatus,
  isCompletableActivityStatus,
} from "../../../../../lib/activity/activityLifecycle";
import {
  getDurationMs,
  safeCreateActivityProcessingLog,
} from "../../../../../lib/activity/activityProcessingLogs";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
import { deriveCategoryCandidates } from "../../../../../lib/activity/categoryDerivation/ruleExtractor";
import {
  resolveCategoryCandidates,
  type CategoryResolverCreatePolicy,
  type CategoryResolverSupabaseClient,
} from "../../../../../lib/activity/categoryDerivation/resolver";
import {
  persistCategoryDerivations,
  type CategoryDerivationPersistenceSupabaseClient,
} from "../../../../../lib/activity/categoryDerivation/persistDerivations";
import type { CategoryDerivationInput } from "../../../../../lib/activity/categoryDerivation/types";
import {
  getCategoryDerivationRouteRunnerConfig,
  type CategoryDerivationRouteRunnerConfig,
} from "../../../../../lib/activity/categoryDerivation/config";
import {
  runCategoryDerivationForCompleteRoute as runCategoryDerivationRouteRunnerForCompleteRoute,
  type CategoryDerivationCompleteRouteIntegrationSupabaseClient,
} from "../../../../../lib/activity/categoryDerivation/completeRouteIntegration";
import type { AdditionalValueObjectCategoryLink } from "../../../../../lib/activity/valueObjectBridge";
import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
import {
  createRawActivitySignal,
  markRawActivitySignalFailed,
  markRawActivitySignalProcessed,
} from "../../../../../lib/activity/rawActivitySignals";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityCompleteBody = {
  eventId?: unknown;
  endedAt?: unknown;
  endTime?: unknown;
  durationMinutes?: unknown;
  comment?: unknown;
  proof?: unknown;
  p4Step?: unknown;
  purpose?: unknown;
};

type ActivityEventRow = {
  id: string;
  user_id: string;
  performed_by_actor_id: string | null;
  acting_as_actor_id: string | null;
  acting_for_actor_id: string | null;
  activity_type_id: string | null;
  activity_template_id: string | null;
  template_id: string | null;
  event_code: string | null;
  input_text: string | null;
  title: string | null;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  source: string | null;
  status: string;
  privacy_scope: string | null;
  processing_status: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CompletionTiming =
  | {
      ok: true;
      startedAt: string;
      endedAt: string;
      durationMinutes: number;
    }
  | {
      ok: false;
      error: string;
    };


const CATEGORY_DERIVATION_COMPLETE_ROUTE_CREATE_POLICY: CategoryResolverCreatePolicy =
  "suggested_only";

type CategoryDerivationCompleteRoutePolicy = {
  enabled: boolean;
  reason: string | null;
  inputText: string | null;
  actorId: string | null;
};

type CategoryDerivationCompleteRouteResult = {
  enabled: boolean;
  ok: boolean | null;
  skipped: boolean;
  reason: string | null;
  error: string | null;
  derivationRunId: string | null;
  extractionCandidateCount: number;
  resolutionCandidateCount: number;
  resolutionUnresolvedCount: number;
  persistenceDerivationRowsCreated: number;
  additionalCategoryLinks: AdditionalValueObjectCategoryLink[];
  warnings: string[];
  errors: string[];
  policy: CategoryDerivationCompleteRoutePolicy;
};

function asRecordForCategoryDerivation(
  value: unknown
): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asStringForCategoryDerivation(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumberForCategoryDerivation(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asBooleanForCategoryDerivation(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function readStringFieldForCategoryDerivation(
  value: unknown,
  fieldNames: string[]
): string | null {
  const record = asRecordForCategoryDerivation(value);

  for (const fieldName of fieldNames) {
    const parsed = asStringForCategoryDerivation(record[fieldName]);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function readNumberFieldForCategoryDerivation(
  value: unknown,
  fieldNames: string[]
): number | null {
  const record = asRecordForCategoryDerivation(value);

  for (const fieldName of fieldNames) {
    const parsed = asNumberForCategoryDerivation(record[fieldName]);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function readBooleanFieldForCategoryDerivation(
  value: unknown,
  fieldNames: string[]
): boolean | null {
  const record = asRecordForCategoryDerivation(value);

  for (const fieldName of fieldNames) {
    const parsed = asBooleanForCategoryDerivation(record[fieldName]);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function readStringArrayFieldForCategoryDerivation(
  value: unknown,
  fieldNames: string[]
): string[] {
  const record = asRecordForCategoryDerivation(value);

  for (const fieldName of fieldNames) {
    const possibleArray = record[fieldName];

    if (Array.isArray(possibleArray)) {
      return possibleArray
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }

  return [];
}

function readStringFieldFromCompleteRouteBody(
  body: ActivityCompleteBody,
  fieldNames: string[]
): string | null {
  return readStringFieldForCategoryDerivation(body, fieldNames);
}

function isCategoryDerivationProofDebugRequestForCompleteRoute(
  body: ActivityCompleteBody
): boolean {
  const proof = readStringFieldFromCompleteRouteBody(body, [
    "proof",
    "proofMarker",
    "proof_marker",
  ]);

  const p4Step = readStringFieldFromCompleteRouteBody(body, [
    "p4Step",
    "p4_step",
  ]);

  const purpose = readStringFieldFromCompleteRouteBody(body, [
    "purpose",
    "proofPurpose",
    "proof_purpose",
  ]);

  return (
    proof?.includes("P4.10.0-C8-E-F6-E") === true ||
    p4Step?.startsWith("P4.10.0-C8-E-F6-E") === true ||
    purpose === "real_complete_route_production_persist_proof"
  );
}

function shouldExposeCategoryDerivationDiagnosticForCompleteRoute(params: {
  body: ActivityCompleteBody;
  config: CategoryDerivationRouteRunnerConfig;
}): boolean {
  return (
    params.config.includeResponseDebug ||
    isCategoryDerivationProofDebugRequestForCompleteRoute(params.body)
  );
}

type CategoryDerivationRouteRunnerCompleteRouteResult = Awaited<
  ReturnType<typeof runCategoryDerivationRouteRunnerForCompleteRoute>
>;

function buildCategoryDerivationDiagnosticForCompleteRoute(params: {
  result: CategoryDerivationRouteRunnerCompleteRouteResult;
  exposureReason: string;
}) {
  const { result, exposureReason } = params;
  const idempotencyRecord = asRecordForCategoryDerivation(result.idempotency);
  const idempotencyFound =
    readBooleanFieldForCategoryDerivation(idempotencyRecord, ["found"]) ??
    null;

  const existingCompletedRunFound =
    result.reason === "existing_completed_run_found" ||
    idempotencyFound === true;

  const routeRunnerReason = result.reason;
  const failedButCompletionContinued =
    result.ok === true &&
    (routeRunnerReason === "route_runner_failed" ||
      routeRunnerReason === "simulated_persistence_failure" ||
      routeRunnerReason === "lookup_error");

  return {
    ok: result.ok,
    status: result.skipped ? "skipped" : result.ok ? "completed" : "warning",
    mode: result.mode,
    reason: result.reason,
    derivationRunId: result.derivationRunId,
    persistenceDerivationRowsCreated:
      result.persistenceDerivationRowsCreated,
    activityCategoryDerivationsCount:
      result.persistenceDerivationRowsCreated,
    existingCompletedRunFound,
    routeRunnerReason,
    failedButCompletionContinued,
    enabled: result.enabled,
    skipped: result.skipped,
    candidateCount: result.candidateCount,
    resolvedCandidateCount: result.resolvedCandidateCount,
    routeRunner: result.routeRunner,
    idempotency: result.idempotency,
    warnings: result.warnings,
    errors: result.errors,
    exposure: {
      exposed: true,
      reason: exposureReason,
      sanitized: true,
      rawRowsExposed: false,
      secretsExposed: false,
    },
  };
}

function buildAlreadyCompletedCategoryDerivationDiagnosticForCompleteRoute(params: {
  config: CategoryDerivationRouteRunnerConfig;
  exposureReason: string;
}) {
  return {
    ok: true,
    status: "already_completed_not_executed",
    mode: params.config.mode,
    reason: "already_completed",
    derivationRunId: null,
    persistenceDerivationRowsCreated: 0,
    activityCategoryDerivationsCount: 0,
    existingCompletedRunFound: null,
    routeRunnerReason: "already_completed",
    failedButCompletionContinued: false,
    enabled: !params.config.isDisabled,
    skipped: true,
    candidateCount: 0,
    resolvedCandidateCount: 0,
    routeRunner: {
      executed: false,
      persisted: false,
      resolved: false,
    },
    idempotency: null,
    warnings: params.config.warnings,
    errors: [],
    exposure: {
      exposed: true,
      reason: params.exposureReason,
      sanitized: true,
      rawRowsExposed: false,
      secretsExposed: false,
    },
  };
}

function isUuidLikeForCategoryDerivation(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function getCategoryDerivationInputTextForCompleteRoute(
  event: ActivityEventRow
): string | null {
  return (
    asStringForCategoryDerivation(event.input_text) ??
    asStringForCategoryDerivation(event.title) ??
    asStringForCategoryDerivation(event.description)
  );
}

function isCategoryDerivationSourceAllowedForCompleteRoute(
  source: string | null
): boolean {
  const normalizedSource = asStringForCategoryDerivation(source)?.toLowerCase() ?? null;

  if (normalizedSource === null) {
    return true;
  }

  const directlyAllowedSources = new Set([
    "manual",
    "manual_chat",
    "chat",
    "chat_ai",
    "free_text",
    "free_text_manual",
    "app_action",
    "debug",
    "debug_free_text",
  ]);

  return (
    directlyAllowedSources.has(normalizedSource) ||
    normalizedSource.includes("manual") ||
    normalizedSource.includes("chat") ||
    normalizedSource.includes("free_text") ||
    normalizedSource.includes("debug")
  );
}

function getCategoryDerivationPolicyForCompleteRoute(params: {
  event: ActivityEventRow;
  completedStatus: string;
}): CategoryDerivationCompleteRoutePolicy {
  const { event, completedStatus } = params;

  if (event.status !== completedStatus) {
    return {
      enabled: false,
      reason: "not_completed_status",
      inputText: null,
      actorId: null,
    };
  }

  if (!isCategoryDerivationSourceAllowedForCompleteRoute(event.source)) {
    return {
      enabled: false,
      reason: "source_not_allowed",
      inputText: null,
      actorId: null,
    };
  }

  const inputText = getCategoryDerivationInputTextForCompleteRoute(event);

  if (inputText === null) {
    return {
      enabled: false,
      reason: "missing_textual_input",
      inputText: null,
      actorId: null,
    };
  }

  const actorId =
    event.performed_by_actor_id ??
    event.acting_as_actor_id ??
    event.acting_for_actor_id;

  if (!isUuidLikeForCategoryDerivation(actorId)) {
    return {
      enabled: false,
      reason: "missing_actor_id",
      inputText,
      actorId: null,
    };
  }

  return {
    enabled: true,
    reason: null,
    inputText,
    actorId,
  };
}

function buildAdditionalCategoryLinksForCompleteRoute(params: {
  enabled: boolean;
  activityEventId: string;
  derivationRunId: string | null;
  resolutionResult: unknown;
}): AdditionalValueObjectCategoryLink[] {
  const { enabled, activityEventId, derivationRunId, resolutionResult } = params;

  if (!enabled) {
    return [];
  }

  const resolutionRecord = asRecordForCategoryDerivation(resolutionResult);
  const possibleCandidates = resolutionRecord.candidates;
  const resolvedCandidates = Array.isArray(possibleCandidates)
    ? possibleCandidates
    : [];

  const allowedResolutionStatuses = new Set([
    "resolved_existing",
    "created_suggested",
    "created_active",
  ]);

  const links: AdditionalValueObjectCategoryLink[] = [];

  for (const candidate of resolvedCandidates) {
    const categoryId = readStringFieldForCategoryDerivation(candidate, [
      "categoryId",
      "category_id",
      "resolvedCategoryId",
      "resolved_category_id",
    ]);

    if (!isUuidLikeForCategoryDerivation(categoryId)) {
      continue;
    }

    const resolutionStatus =
      readStringFieldForCategoryDerivation(candidate, [
        "resolutionStatus",
        "resolution_status",
      ]) ?? "resolved_existing";

    if (!allowedResolutionStatuses.has(resolutionStatus)) {
      continue;
    }

    const candidateSlug =
      readStringFieldForCategoryDerivation(candidate, [
        "candidateSlug",
        "candidate_slug",
        "categorySlug",
        "category_slug",
        "slug",
      ]) ?? categoryId;

    links.push({
      categoryId,
      categoryTable: "contextual_categories",
      categoryRole: "semantic_component",
      source: "rule",
      confidence: readNumberFieldForCategoryDerivation(candidate, [
        "confidence",
        "score",
      ]),
      derivationRunId,
      activityCategoryDerivationId: null,
      activityEventId,
      candidateSlug,
      candidateTitle: readStringFieldForCategoryDerivation(candidate, [
        "candidateTitle",
        "candidate_title",
        "title",
        "label",
        "name",
      ]),
      semanticLayer: readStringFieldForCategoryDerivation(candidate, [
        "semanticLayer",
        "semantic_layer",
      ]),
    });
  }

  return links;
}

async function runCategoryDerivationForCompleteRoute(params: {
  event: ActivityEventRow;
  completedStatus: string;
}): Promise<CategoryDerivationCompleteRouteResult> {
  const policy = getCategoryDerivationPolicyForCompleteRoute(params);

  if (!policy.enabled || policy.inputText === null || policy.actorId === null) {
    return {
      enabled: false,
      ok: null,
      skipped: true,
      reason: policy.reason,
      error: null,
      derivationRunId: null,
      extractionCandidateCount: 0,
      resolutionCandidateCount: 0,
      resolutionUnresolvedCount: 0,
      persistenceDerivationRowsCreated: 0,
      additionalCategoryLinks: [],
      warnings: [],
      errors: [],
      policy,
    };
  }

  try {
    const { event } = params;

    const derivationInput: CategoryDerivationInput = {
      activityEventId: event.id,
      inputText: policy.inputText,
      title: event.title,
      description: event.description,
      durationMinutes: event.duration_minutes ?? 0,
      inputLanguage: null,
      actorId: policy.actorId,
      organizationId: null,
      metadata: {
        endpoint: "/api/activity/complete",
        p4Step: "P4.10.0-C8-P3-B7-C1-B",
        featureFlag: "categoryDerivation",
      },
    };

    const extractionResult = deriveCategoryCandidates(derivationInput);

    const resolutionResult = await resolveCategoryCandidates(
      supabase as unknown as CategoryResolverSupabaseClient,
      extractionResult.candidates,
      {
        createPolicy: CATEGORY_DERIVATION_COMPLETE_ROUTE_CREATE_POLICY,
        dryRun: false,
        sourceType: "rule",
        defaultCategoryType: "derived",
      }
    );

    const persistenceResult = await persistCategoryDerivations(
      supabase as unknown as CategoryDerivationPersistenceSupabaseClient,
      {
        activityEventId: event.id,
        input: derivationInput,
        derivationResult: extractionResult,
        resolvedCandidates: resolutionResult.candidates,
        actorId: policy.actorId,
        organizationId: null,
        modelName: null,
        promptVersion: null,
        needsUserConfirmation:
          resolutionResult.unresolvedCount > 0 ||
          extractionResult.candidates.some((candidate) =>
            Boolean((candidate as { needsUserReview?: unknown }).needsUserReview)
          ),
      }
    );

    const persistenceOk =
      readBooleanFieldForCategoryDerivation(persistenceResult, ["ok"]) ?? false;
    const derivationRunId = readStringFieldForCategoryDerivation(
      persistenceResult,
      ["derivationRunId", "derivation_run_id", "runId", "run_id"]
    );

    const persistenceDerivationRowsCreated =
      readNumberFieldForCategoryDerivation(persistenceResult, [
        "derivationRowsCreated",
        "derivation_rows_created",
      ]) ?? 0;

    const additionalCategoryLinks = buildAdditionalCategoryLinksForCompleteRoute({
      enabled: true,
      activityEventId: event.id,
      derivationRunId,
      resolutionResult,
    });

    const warnings = [
      ...extractionResult.warnings,
      ...resolutionResult.warnings,
      ...readStringArrayFieldForCategoryDerivation(persistenceResult, ["warnings"]),
    ];

    const errors = [
      ...extractionResult.errors,
      ...resolutionResult.errors,
      ...readStringArrayFieldForCategoryDerivation(persistenceResult, ["errors"]),
    ];

    const ok = extractionResult.ok && resolutionResult.ok && persistenceOk;

    return {
      enabled: true,
      ok,
      skipped: false,
      reason: null,
      error: null,
      derivationRunId,
      extractionCandidateCount: extractionResult.candidates.length,
      resolutionCandidateCount: resolutionResult.candidates.length,
      resolutionUnresolvedCount: resolutionResult.unresolvedCount,
      persistenceDerivationRowsCreated,
      additionalCategoryLinks,
      warnings,
      errors,
      policy,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Category Derivation error";

    return {
      enabled: true,
      ok: false,
      skipped: false,
      reason: "exception",
      error: message,
      derivationRunId: null,
      extractionCandidateCount: 0,
      resolutionCandidateCount: 0,
      resolutionUnresolvedCount: 0,
      persistenceDerivationRowsCreated: 0,
      additionalCategoryLinks: [],
      warnings: [],
      errors: [message],
      policy,
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

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

function resolveCompletionTiming(params: {
  event: ActivityEventRow;
  body: ActivityCompleteBody;
}): CompletionTiming {
  const { event, body } = params;

  if (!event.started_at) {
    return {
      ok: false,
      error: "Cannot complete activity event without started_at.",
    };
  }

  const startedDate = new Date(event.started_at);

  if (Number.isNaN(startedDate.getTime())) {
    return {
      ok: false,
      error: "Stored started_at is invalid.",
    };
  }

  const rawEndedAt = asString(body.endedAt) ?? asString(body.endTime);
  const explicitDurationMinutes = asNumber(body.durationMinutes);

  if (explicitDurationMinutes !== null && explicitDurationMinutes < 0) {
    return {
      ok: false,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  if (rawEndedAt) {
    const endedDate = new Date(rawEndedAt);

    if (Number.isNaN(endedDate.getTime())) {
      return {
        ok: false,
        error: "Invalid endedAt or endTime.",
      };
    }

    if (endedDate.getTime() < startedDate.getTime()) {
      return {
        ok: false,
        error: "endedAt must be greater than or equal to startedAt.",
      };
    }

    return {
      ok: true,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: Math.round(
        (endedDate.getTime() - startedDate.getTime()) / 60000
      ),
    };
  }

  if (explicitDurationMinutes !== null) {
    const endedDate = new Date(
      startedDate.getTime() + explicitDurationMinutes * 60000
    );

    return {
      ok: true,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: explicitDurationMinutes,
    };
  }

  const endedDate = new Date();

  if (endedDate.getTime() < startedDate.getTime()) {
    return {
      ok: false,
      error: "Current time is earlier than startedAt.",
    };
  }

  return {
    ok: true,
    startedAt: startedDate.toISOString(),
    endedAt: endedDate.toISOString(),
    durationMinutes: Math.round(
      (endedDate.getTime() - startedDate.getTime()) / 60000
    ),
  };
}

async function getExistingImpactEventsCount(eventId: string) {
  const { count, error } = await supabase
    .from("impact_events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/complete",
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Complete a previously started activity event and process rule-based impacts."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    example: {
      eventId: "activity-event-uuid",
      comment: "Completed lifecycle smoke test",
    },
    deterministicTestExample: {
      eventId: "activity-event-uuid",
      durationMinutes: 5,
      comment: "Completed lifecycle smoke test with fixed duration",
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

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  let body: ActivityCompleteBody;

  try {
    body = (await request.json()) as ActivityCompleteBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const eventId = asString(body.eventId);

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "eventId is required.",
      },
      { status: 400 }
    );
  }

  const { data: eventData, error: eventError } = await supabase
    .from("activity_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json(
      {
        ok: false,
        error: eventError.message,
      },
      { status: 500 }
    );
  }

  if (!eventData) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity event not found or access denied.",
      },
      { status: 404 }
    );
  }

  const event = eventData as ActivityEventRow;
  const completedStatus = ACTIVITY_STATUS_COMPLETED;

  if (event.status === completedStatus) {
    try {
      const existingImpactEventsCount = await getExistingImpactEventsCount(
        event.id
      );

      const impactResult = await processActivityImpacts({
        eventId: event.id,
        userId: appUser.id,
        activityTemplateId: event.activity_template_id,
        activityTypeId: event.activity_type_id,
        durationMinutes: event.duration_minutes,
        startedAt: event.started_at,
      });

      const categoryDerivationRouteRunnerConfig =
        getCategoryDerivationRouteRunnerConfig();
      const shouldExposeCategoryDerivationDiagnostic =
        shouldExposeCategoryDerivationDiagnosticForCompleteRoute({
          body,
          config: categoryDerivationRouteRunnerConfig,
        });
      const categoryDerivationDiagnostic =
        shouldExposeCategoryDerivationDiagnostic
          ? buildAlreadyCompletedCategoryDerivationDiagnosticForCompleteRoute({
              config: categoryDerivationRouteRunnerConfig,
              exposureReason:
                categoryDerivationRouteRunnerConfig.includeResponseDebug
                  ? "include_response_debug"
                  : "proof_request_marker",
            })
          : undefined;

      return NextResponse.json({
        ok: true,
        status: "already_completed",
        event,
        impactEvents: impactResult.impactEvents,
        dailyAggregates: impactResult.dailyAggregates,
        currentSnapshots: impactResult.currentSnapshots,
        impactProcessor: {
          ok: impactResult.ok,
          skipped: impactResult.skipped,
          reason: impactResult.reason,
          counts: impactResult.counts,
          existingImpactEventsCount,
        },
        categoryDerivation: categoryDerivationDiagnostic,
        lifecycle: {
          alreadyCompleted: true,
          note:
            "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to inspect completed activity event.",
        },
        { status: 500 }
      );
    }
  }

  if (!isCompletableActivityStatus(event.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
        allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
      },
      { status: 409 }
    );
  }

  const timing = resolveCompletionTiming({
    event,
    body,
  });

  if (!timing.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: timing.error,
      },
      { status: 400 }
    );
  }

  const comment = asString(body.comment);
  const existingMetadata = asRecord(event.metadata_json);
  const nowIso = new Date().toISOString();

  const processingRunId = randomUUID();
  const processingStartedAt = new Date();

  const rawSignalResult = await createRawActivitySignal({
    userId: appUser.id,
    sourceType: "manual_form",
    sourceEventId: event.id,
    idempotencyKey: `${event.id}:complete:${timing.endedAt}:${timing.durationMinutes}`,
    rawPayload: {
      endpoint: "/api/activity/complete",
      body,
      eventId: event.id,
      previousStatus: event.status,
      timing,
    },
    normalizedPreview: {
      activityEventId: event.id,
      title: event.title,
      previousStatus: event.status,
      nextStatus: completedStatus,
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    occurredAt: timing.endedAt,
    trustLevel: "medium",
    privacyScope:
      event.privacy_scope === "shared_with_org" ||
      event.privacy_scope === "public_masked" ||
      event.privacy_scope === "public"
        ? event.privacy_scope
        : "private",
    processingStatus: "processing",
    metadata: {
      parser: "template_first_v2",
      processingRunId,
      mode: "template_first_complete",
      lifecycle: completedStatus,
      previousStatus: event.status,
      activityTemplateId: event.activity_template_id,
      activityTypeId: event.activity_type_id,
    },
  });

  const rawSignal = rawSignalResult.signal;

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    activityEventId: event.id,
    processingRunId,
    processorName: "activity_complete_route",
    processingStage: "ingest",
    processingStatus: rawSignalResult.ok ? "completed" : "warning",
    severity: rawSignalResult.ok ? "info" : "warning",
    message: rawSignalResult.ok
      ? "Raw activity complete signal captured."
      : "Raw activity complete signal creation failed; continuing without raw signal.",
    input: {
      eventId: event.id,
      previousStatus: event.status,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    output: rawSignal
      ? {
          rawSignalId: rawSignal.id,
        }
      : {},
    error: rawSignalResult.ok
      ? {}
      : {
          message: rawSignalResult.error,
        },
    metadata: {
      endpoint: "/api/activity/complete",
      mode: "template_first_complete",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

  const { data: updatedEventData, error: updateError } = await supabase
    .from("activity_events")
    .update({
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      status: completedStatus,
      processing_status: "processed",
      description: comment ?? event.description,
      metadata_json: {
        ...existingMetadata,
        lifecycle: completedStatus,
        lifecycle_completed_at: nowIso,
        previous_status: event.status,
        completion_comment: comment,
        completion_duration_source:
          asNumber(body.durationMinutes) !== null
            ? "explicit_duration"
            : asString(body.endedAt) || asString(body.endTime)
              ? "explicit_end_time"
              : "current_time",
      },
      updated_at: nowIso,
    })
    .eq("id", event.id)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .select()
    .single();

  if (updateError || !updatedEventData) {
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error: updateError?.message ?? "Failed to complete activity event.",
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: event.id,
      processingRunId,
      processorName: "activity_complete_route",
      processingStage: "complete_event",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to update activity event to completed status.",
      input: {
        eventId: event.id,
        previousStatus: event.status,
        endedAt: timing.endedAt,
        durationMinutes: timing.durationMinutes,
      },
      error: {
        message: updateError?.message ?? "Failed to complete activity event.",
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    return NextResponse.json(
      {
        ok: false,
        error: updateError?.message ?? "Failed to complete activity event.",
      },
      { status: 500 }
    );
  }

  const updatedEvent = updatedEventData as ActivityEventRow;

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    activityEventId: updatedEvent.id,
    processingRunId,
    processorName: "activity_complete_route",
    processingStage: "complete_event",
    processingStatus: "completed",
    severity: "info",
    message: "Activity event completed from lifecycle complete flow.",
    input: {
      eventId: event.id,
      previousStatus: event.status,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    output: {
      activityEventId: updatedEvent.id,
      status: updatedEvent.status,
      processingStatus: updatedEvent.processing_status,
    },
    metadata: {
      endpoint: "/api/activity/complete",
      mode: "template_first_complete",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

  try {
    const impactResult = await processActivityImpacts({
      eventId: updatedEvent.id,
      userId: appUser.id,
      activityTemplateId: updatedEvent.activity_template_id,
      activityTypeId: updatedEvent.activity_type_id,
      durationMinutes: updatedEvent.duration_minutes,
      startedAt: updatedEvent.started_at,
    });

    const processedSignalResult = rawSignal
      ? await markRawActivitySignalProcessed({
          signalId: rawSignal.id,
          userId: appUser.id,
          outputEventId: updatedEvent.id,
          normalizedPreview: {
            activityEventId: updatedEvent.id,
            previousStatus: event.status,
            nextStatus: updatedEvent.status,
            startedAt: timing.startedAt,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
            impactProcessor: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
          },
        })
      : null;

    if (processedSignalResult && !processedSignalResult.ok) {
      await safeCreateActivityProcessingLog({
        userId: appUser.id,
        rawSignalId: rawSignal?.id ?? null,
        activityEventId: updatedEvent.id,
        processingRunId,
        processorName: "activity_complete_route",
        processingStage: "finalize",
        processingStatus: "warning",
        severity: "warning",
        message: "Completed activity was processed, but raw signal could not be marked as processed.",
        error: {
          message: processedSignalResult.error,
        },
        metadata: {
          endpoint: "/api/activity/complete",
          mode: "template_first_complete",
        },
        startedAt: processingStartedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: getDurationMs(processingStartedAt),
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: updatedEvent.id,
      processingRunId,
      processorName: "activity_complete_route",
      processingStage: "process_impacts",
      processingStatus: impactResult.ok ? "completed" : "skipped",
      severity: impactResult.ok ? "info" : "notice",
      message: "Rule-based activity impacts processed after completion.",
      input: {
        activityTemplateId: updatedEvent.activity_template_id,
        activityTypeId: updatedEvent.activity_type_id,
        durationMinutes: updatedEvent.duration_minutes,
        startedAt: updatedEvent.started_at,
      },
      output: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });


    const rubricatorClassificationResult =
      await ensureActivityEventRubricatorClassificationForKnownTemplate({
        supabase,
        eventId: updatedEvent.id,
        userId: appUser.id,
        activityTemplateId: updatedEvent.activity_template_id,
        processorName:
          "activity_complete_route_known_template_rubricator_classification",
      });

    const rubricatorClassificationLogResult =
      await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: updatedEvent.id,
      processingRunId,
      processorName: "activity_complete_route_rubricator_classification",
      processingStage: "finalize",
      processingStatus: rubricatorClassificationResult.ok
        ? rubricatorClassificationResult.skipped
          ? "skipped"
          : "completed"
        : "warning",
      severity: rubricatorClassificationResult.ok ? "info" : "warning",
      message:
        "Known-template rubricator classification ensured before Value Object bridge.",
      input: {
        eventId: updatedEvent.id,
        activityTemplateId: updatedEvent.activity_template_id,
      },
      output: {
        ok: rubricatorClassificationResult.ok,
        skipped: rubricatorClassificationResult.skipped,
        skipReason: rubricatorClassificationResult.skipReason,
        ruleKey: rubricatorClassificationResult.ruleKey,
        classificationId: rubricatorClassificationResult.classificationId,
        classificationStatus:
          rubricatorClassificationResult.classificationStatus,
        created: rubricatorClassificationResult.created,
        alreadyExisted: rubricatorClassificationResult.alreadyExisted,
        errors: rubricatorClassificationResult.errors,
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
        p4Step: "P4.7.8-R-G1",
        ruleResolver: buildRubricatorResolverLogMetadata(rubricatorClassificationResult),
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    const categoryDerivationResult = await runCategoryDerivationForCompleteRoute({
      event: updatedEvent,
      completedStatus,
    });

    const categoryDerivationBridgeAdditionalCategoryLinks =
      categoryDerivationResult.additionalCategoryLinks;

    const categoryDerivationRouteRunnerConfig =
      getCategoryDerivationRouteRunnerConfig();

    const categoryDerivationRouteRunnerResult =
      await runCategoryDerivationRouteRunnerForCompleteRoute({
        supabase:
          supabase as unknown as CategoryDerivationCompleteRouteIntegrationSupabaseClient,
        activityEvent: {
          id: updatedEvent.id,
          input_text: updatedEvent.input_text,
          title: updatedEvent.title,
          description: updatedEvent.description,
          duration_minutes: updatedEvent.duration_minutes,
          source: updatedEvent.source,
          metadata_json: asRecord(updatedEvent.metadata_json),
        },
        actorId:
          updatedEvent.performed_by_actor_id ??
          updatedEvent.acting_as_actor_id ??
          updatedEvent.acting_for_actor_id ??
          null,
        config: categoryDerivationRouteRunnerConfig,
        metadata: {
          completeRouteStep: "P4.10.0-C8-E-F6-E-E-S",
          legacyCategoryDerivationOk: categoryDerivationResult.ok,
          legacyDerivationRunId: categoryDerivationResult.derivationRunId,
        },
      });

    const shouldExposeCategoryDerivationDiagnostic =
      shouldExposeCategoryDerivationDiagnosticForCompleteRoute({
        body,
        config: categoryDerivationRouteRunnerConfig,
      });
    const categoryDerivationDiagnostic =
      shouldExposeCategoryDerivationDiagnostic
        ? buildCategoryDerivationDiagnosticForCompleteRoute({
            result: categoryDerivationRouteRunnerResult,
            exposureReason:
              categoryDerivationRouteRunnerConfig.includeResponseDebug
                ? "include_response_debug"
                : "proof_request_marker",
          })
        : undefined;

    const categoryDerivationProcessingLogResult =
      await safeCreateActivityProcessingLog({
        userId: appUser.id,
        rawSignalId: rawSignal?.id ?? null,
        activityEventId: updatedEvent.id,
        processingRunId,
        processorName: "activity_complete_route_category_derivation",
        processingStage: "finalize",
        processingStatus: categoryDerivationResult.skipped
          ? "skipped"
          : categoryDerivationResult.ok
            ? "completed"
            : "warning",
        severity: categoryDerivationResult.ok === false ? "warning" : "info",
        message:
          "Rule-based Category Derivation processed before Value Object bridge.",
        input: {
          eventId: updatedEvent.id,
          source: updatedEvent.source,
          status: updatedEvent.status,
          policy: categoryDerivationResult.policy,
        },
        output: {
          enabled: categoryDerivationResult.enabled,
          ok: categoryDerivationResult.ok,
          skipped: categoryDerivationResult.skipped,
          reason: categoryDerivationResult.reason,
          error: categoryDerivationResult.error,
          derivationRunId: categoryDerivationResult.derivationRunId,
          extractionCandidateCount:
            categoryDerivationResult.extractionCandidateCount,
          resolutionCandidateCount:
            categoryDerivationResult.resolutionCandidateCount,
          resolutionUnresolvedCount:
            categoryDerivationResult.resolutionUnresolvedCount,
          persistenceDerivationRowsCreated:
            categoryDerivationResult.persistenceDerivationRowsCreated,
          additionalCategoryLinksCount:
            categoryDerivationBridgeAdditionalCategoryLinks.length,
          warnings: categoryDerivationResult.warnings,
          errors: categoryDerivationResult.errors,
        },
        metadata: {
          endpoint: "/api/activity/complete",
          mode: "template_first_complete",
          p4Step: "P4.10.0-C8-P3-B7-C1-B",
          createPolicy: CATEGORY_DERIVATION_COMPLETE_ROUTE_CREATE_POLICY,
          dryRun: false,
        },
        startedAt: processingStartedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: getDurationMs(processingStartedAt),
      });

    if (!categoryDerivationProcessingLogResult.ok) {
      console.warn("Category Derivation processing log failed", {
        eventId: updatedEvent.id,
        error: categoryDerivationProcessingLogResult.error,
      });
    }

    const valueObjectBridgeResult = await processActivityValueObjectBridge({
      supabase,
      eventId: updatedEvent.id,
      processorName: "activity_complete_route_p4_7_7",
      additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks,
    });

    const valueObjectBridgeLogResult =
      await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: updatedEvent.id,
      processingRunId,
      processorName: "activity_complete_route_value_object_bridge",
      processingStage: "finalize",
      processingStatus: valueObjectBridgeResult.ok
        ? valueObjectBridgeResult.skipped
          ? "skipped"
          : "completed"
        : "warning",
      severity: valueObjectBridgeResult.ok ? "info" : "warning",
      message: "Value Object bridge processed after activity completion.",
      input: {
        eventId: updatedEvent.id,
      },
      output: {
        ok: valueObjectBridgeResult.ok,
        skipped: valueObjectBridgeResult.skipped,
        skipReason: valueObjectBridgeResult.skipReason,
        mappingSkipped: valueObjectBridgeResult.mappingResult?.skipped ?? null,
        mappingsCount: valueObjectBridgeResult.mappingResult?.mappings.length ?? 0,
        bridgeCreatedCount: valueObjectBridgeResult.bridgeResult?.created.length ?? 0,
        errors: valueObjectBridgeResult.errors,
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
        p4Step: "P4.7.7-R-E2",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    return NextResponse.json({
      ok: true,
      status: completedStatus,
      event: updatedEvent,
      impactEvents: impactResult.impactEvents,
      dailyAggregates: impactResult.dailyAggregates,
      currentSnapshots: impactResult.currentSnapshots,
      impactProcessor: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      rubricatorClassification: {
        ok: rubricatorClassificationResult.ok,
        skipped: rubricatorClassificationResult.skipped,
        skipReason: rubricatorClassificationResult.skipReason,
        ruleKey: rubricatorClassificationResult.ruleKey,
        classificationId: rubricatorClassificationResult.classificationId,
        classificationStatus:
          rubricatorClassificationResult.classificationStatus,
        created: rubricatorClassificationResult.created,
        alreadyExisted: rubricatorClassificationResult.alreadyExisted,
        errors: rubricatorClassificationResult.errors,
      },
      categoryDerivationRouteRunner: {
        enabled: categoryDerivationRouteRunnerResult.enabled,
        mode: categoryDerivationRouteRunnerResult.mode,
        ok: categoryDerivationRouteRunnerResult.ok,
        skipped: categoryDerivationRouteRunnerResult.skipped,
        reason: categoryDerivationRouteRunnerResult.reason,
        derivationRunId: categoryDerivationRouteRunnerResult.derivationRunId,
        candidateCount: categoryDerivationRouteRunnerResult.candidateCount,
        resolvedCandidateCount:
          categoryDerivationRouteRunnerResult.resolvedCandidateCount,
        persistenceDerivationRowsCreated:
          categoryDerivationRouteRunnerResult.persistenceDerivationRowsCreated,
        warnings: categoryDerivationRouteRunnerResult.warnings,
        errors: categoryDerivationRouteRunnerResult.errors,
      },
      categoryDerivation: categoryDerivationDiagnostic,
      valueObjectBridge: {
        ok: valueObjectBridgeResult.ok,
        skipped: valueObjectBridgeResult.skipped,
        skipReason: valueObjectBridgeResult.skipReason,
        errors: valueObjectBridgeResult.errors,
        mapping: valueObjectBridgeResult.mappingResult
          ? {
              ok: valueObjectBridgeResult.mappingResult.ok,
              skipped: valueObjectBridgeResult.mappingResult.skipped,
              skipReason: valueObjectBridgeResult.mappingResult.skipReason,
              classificationSummaryCount:
                valueObjectBridgeResult.mappingResult.classificationSummary
                  .length,
              mappingsCount:
                valueObjectBridgeResult.mappingResult.mappings.length,
            }
          : null,
        bridge: valueObjectBridgeResult.bridgeResult
          ? {
              ok: valueObjectBridgeResult.bridgeResult.ok,
              skipped: valueObjectBridgeResult.bridgeResult.skipped,
              skipReason: valueObjectBridgeResult.bridgeResult.skipReason,
              mappingsRequested:
                valueObjectBridgeResult.bridgeResult.mappingsRequested,
              createdCount:
                valueObjectBridgeResult.bridgeResult.created.length,
              created: valueObjectBridgeResult.bridgeResult.created,
              errors: valueObjectBridgeResult.bridgeResult.errors,
            }
          : null,
      },
      processingLogs: {
        rawSignalId: rawSignal?.id ?? null,
        processingRunId,
        rubricatorClassification: {
          ok: rubricatorClassificationLogResult.ok,
          error: rubricatorClassificationLogResult.error,
          logId: rubricatorClassificationLogResult.log?.id ?? null,
        },
        valueObjectBridge: {
          ok: valueObjectBridgeLogResult.ok,
          error: valueObjectBridgeLogResult.error,
          logId: valueObjectBridgeLogResult.log?.id ?? null,
        },
      },
      rawSignal: rawSignal
        ? {
            id: rawSignal.id,
            processingStatus:
              processedSignalResult?.signal?.processing_status ??
              rawSignal.processing_status,
          }
        : null,
      processingRunId,
      lifecycle: {
        startedAt: timing.startedAt,
        endedAt: timing.endedAt,
        durationMinutes: timing.durationMinutes,
        impactsCreated: impactResult.counts.impactEvents > 0,
        note:
          "Activity event was completed. Rule-based impacts, daily aggregates and current snapshots were processed without AI.",
      },
    });
  } catch (error) {
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts after completion.",
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: updatedEvent.id,
      processingRunId,
      processorName: "activity_complete_route",
      processingStage: "process_impacts",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to process rule-based activity impacts after completion.",
      input: {
        activityTemplateId: updatedEvent.activity_template_id,
        activityTypeId: updatedEvent.activity_type_id,
        durationMinutes: updatedEvent.duration_minutes,
        startedAt: updatedEvent.started_at,
      },
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts after completion.",
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    await supabase
      .from("activity_events")
      .update({
        processing_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedEvent.id)
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts after completion.",
        event: updatedEvent,
      },
      { status: 500 }
    );
  }
}
