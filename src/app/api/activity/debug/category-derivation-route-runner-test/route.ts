import { NextResponse } from "next/server";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "././././././lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "././././././lib/activity/activityUserContext";
import {
  runCategoryDerivationRoute,
  type CategoryDerivationRouteRunnerSupabaseClient,
} from "././././././lib/activity/categoryDerivation/routeRunner";
import { supabase } from "././././././lib/supabase";

export const dynamic = "force-dynamic";

type RouteRunnerDebugBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  persist?: unknown;
  resolve?: unknown;
  createPolicy?: unknown;
  defaultStatus?: unknown;
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
    const parsed = Number.parseFloat(value.trim().replace(",", "."));

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

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function asIsoOrNull(value: unknown): string | null {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function resolveTiming(body: RouteRunnerDebugBody): {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
} {
  const durationMinutes = asNumber(body.durationMinutes) ?? 15;
  const explicitEndedAt = asIsoOrNull(body.endedAt);
  const explicitStartedAt = asIsoOrNull(body.startedAt);

  const endedAt = explicitEndedAt ? new Date(explicitEndedAt) : new Date();
  const startedAt = explicitStartedAt
    ? new Date(explicitStartedAt)
    : new Date(endedAt.getTime() - durationMinutes * 60_000);

  return {
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes,
  };
}

function resolverOptionsFromBody(body: RouteRunnerDebugBody) {
  const createPolicy = asString(body.createPolicy);
  const defaultStatus = asString(body.defaultStatus);

  return {
    createPolicy:
      createPolicy === "never" ||
      createPolicy === "suggested_only" ||
      createPolicy === "active_for_confirmed_required"
        ? createPolicy
        : "suggested_only",
    defaultStatus:
      defaultStatus === "active" ||
      defaultStatus === "suggested" ||
      defaultStatus === "needs_review"
        ? defaultStatus
        : "suggested",
    sourceType: "category_derivation_route_runner_test",
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/category-derivation-route-runner-test",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Debug-only endpoint for isolated Category Derivation routeRunner smoke tests."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    runtimeImpact: {
      patchesCompleteRoute: false,
      callsOpenAI: false,
      createsUi: false,
      rerunsCanonicalProofEvent: false,
    },
    example: {
      inputText: "walked to work for 15 minutes",
      durationMinutes: 15,
      title: "RouteRunner smoke test",
      persist: true,
      resolve: true,
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

  let body: RouteRunnerDebugBody;

  try {
    body = (await request.json()) as RouteRunnerDebugBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

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
  const title = asString(body.title) ?? "Category Derivation routeRunner smoke test";
  const description =
    asString(body.description) ??
    "P4.10.0-C8-E-F2-A isolated routeRunner smoke test";

  const nowIso = new Date().toISOString();

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
        parser: "debug_category_derivation_route_runner_test_v1",
        p4Step: "P4.10.0-C8-E-F2-A",
        routeRunnerSmokeTest: true,
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
        error: createError?.message ?? "Failed to create routeRunner test activity event.",
      },
      { status: 500 }
    );
  }

  const persist = asBoolean(body.persist) ?? true;
  const resolve = asBoolean(body.resolve) ?? true;

  const routeRunnerResult = await runCategoryDerivationRoute({
    supabase: supabase as unknown as CategoryDerivationRouteRunnerSupabaseClient,
    activityEventId: createdEventData.id,
    input: {
      activityEventId: createdEventData.id,
      inputText,
      title,
      description,
      durationMinutes: timing.durationMinutes,
      inputLanguage: null,
      actorId: personActor.id,
      organizationId: null,
      metadata: {
        endpoint: "/api/activity/debug/category-derivation-route-runner-test",
        p4Step: "P4.10.0-C8-E-F2-A",
        featureFlag: "routeRunnerSmokeTest",
      },
    },
    resolverOptions: resolverOptionsFromBody(body),
    modelName: null,
    modelAlias: null,
    promptVersion: null,
    schemaVersion: "category_derivation_route_runner_debug_v1",
    policyVersion: "c8-e-f2-a",
    persist,
    resolve,
    metadata: {
      endpoint: "/api/activity/debug/category-derivation-route-runner-test",
      p4Step: "P4.10.0-C8-E-F2-A",
      aiUsed: false,
    },
  });

  return NextResponse.json({
    ok: routeRunnerResult.ok,
    status: routeRunnerResult.ok
      ? "created_and_route_runner_processed"
      : "created_but_route_runner_failed",
    event: {
      id: createdEventData.id,
      user_id: createdEventData.user_id,
      performed_by_actor_id: createdEventData.performed_by_actor_id,
      acting_as_actor_id: createdEventData.acting_as_actor_id,
      input_text: createdEventData.input_text,
      title: createdEventData.title,
      description: createdEventData.description,
      started_at: createdEventData.started_at,
      ended_at: createdEventData.ended_at,
      duration_minutes: createdEventData.duration_minutes,
      status: createdEventData.status,
      processing_status: createdEventData.processing_status,
    },
    routeRunner: {
      ok: routeRunnerResult.ok,
      derivationRunId: routeRunnerResult.derivationRunId,
      persisted: routeRunnerResult.persisted,
      resolved: routeRunnerResult.resolved,
      candidateCount: routeRunnerResult.candidates.length,
      resolvedCandidateCount: routeRunnerResult.resolvedCandidates.length,
      warnings: routeRunnerResult.warnings,
      errors: routeRunnerResult.errors,
      derivation: {
        ok: routeRunnerResult.derivation.ok,
        skipped: routeRunnerResult.derivation.skipped ?? false,
        skipReason: routeRunnerResult.derivation.skipReason ?? null,
        processorVersion: routeRunnerResult.derivation.processorVersion,
        ruleVersion: routeRunnerResult.derivation.ruleVersion ?? null,
        confidence: routeRunnerResult.derivation.confidence ?? null,
        candidates: routeRunnerResult.derivation.candidates.map((candidate) => ({
          slug: candidate.slug,
          title: candidate.title ?? null,
          semanticLayer: candidate.semanticLayer ?? null,
          categoryType: candidate.categoryType ?? null,
          confidence: candidate.confidence ?? null,
          source: candidate.source,
          isRequired: candidate.isRequired ?? false,
          isConfirmed: candidate.isConfirmed ?? false,
          needsUserReview: candidate.needsUserReview ?? false,
        })),
      },
      resolution: routeRunnerResult.resolution
        ? {
            ok: routeRunnerResult.resolution.ok,
            createdCount: routeRunnerResult.resolution.createdCount,
            reusedCount: routeRunnerResult.resolution.reusedCount,
            unresolvedCount: routeRunnerResult.resolution.unresolvedCount,
            candidates: routeRunnerResult.resolution.candidates.map((candidate) => ({
              slug: candidate.slug,
              categoryId: candidate.categoryId,
              resolutionStatus: candidate.resolutionStatus,
            })),
          }
        : null,
      persistence: {
        runCreateOk: routeRunnerResult.persistence.runCreate?.ok ?? null,
        rowsOk: routeRunnerResult.persistence.rows?.ok ?? null,
        rowsCreated: routeRunnerResult.persistence.rows?.rowsCreated ?? null,
        runFinishOk: routeRunnerResult.persistence.runFinish?.ok ?? null,
        runFailOk: routeRunnerResult.persistence.runFail?.ok ?? null,
      },
    },
    metadata: {
      endpoint: "/api/activity/debug/category-derivation-route-runner-test",
      p4Step: "P4.10.0-C8-E-F2-A",
      aiUsed: false,
      patchesCompleteRoute: false,
      rerunsCanonicalProofEvent: false,
    },
  });
}
