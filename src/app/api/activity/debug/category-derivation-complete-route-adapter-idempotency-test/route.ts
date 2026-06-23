import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import {
  getCategoryDerivationRouteRunnerConfig,
  getCategoryDerivationRouteRunnerConfigSummary,
} from "../../../../../../lib/activity/categoryDerivation/config";
import {
  runCategoryDerivationForCompleteRoute,
  type CategoryDerivationCompleteRouteIntegrationResult,
  type CategoryDerivationCompleteRouteIntegrationSupabaseClient,
} from "../../../../../../lib/activity/categoryDerivation/completeRouteIntegration";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const ENDPOINT =
  "/api/activity/debug/category-derivation-complete-route-adapter-idempotency-test";

const P4_STEP = "P4.10.0-C8-E-F5-F-C-A";

const EXPECTED_MODE = "shadow_persist";

const ROUTE_RUNNER_SCHEMA_VERSION = "category_derivation_complete_route_v1";
const ROUTE_RUNNER_POLICY_VERSION = "c8-e-f4";
const ROUTE_RUNNER_PROCESSOR_VERSION = "category_derivation_v1";
const ROUTE_RUNNER_RULE_VERSION = "rules_v1";
const COMPLETED_RUN_STATUSES = ["completed", "completed_with_warnings"];

type JsonRecord = Record<string, unknown>;
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

type DebugBody = {
  eventId?: unknown;
  mode?: unknown;
  callTwice?: unknown;
};

type ActivityEventRow = {
  id: string;
  user_id: string | null;
  performed_by_actor_id: string | null;
  acting_as_actor_id: string | null;
  acting_for_actor_id: string | null;
  input_text: string | null;
  title: string | null;
  description: string | null;
  duration_minutes: number | null;
  source: string | null;
  status: string | null;
  processing_status: string | null;
  metadata_json: JsonRecord | null;
};

type SupabaseErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

type SupabaseQueryResult<T> = {
  data?: T | null;
  error?: SupabaseErrorLike | null;
};

type SupabaseListResult<T> = {
  data?: T[] | null;
  error?: SupabaseErrorLike | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  const record = asRecord(value);

  if (record) {
    const output: JsonObject = {};

    for (const [key, nestedValue] of Object.entries(record)) {
      output[key] = toJsonValue(nestedValue);
    }

    return output;
  }

  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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

function errorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown error";
}

function compactAdapterResult(
  result: CategoryDerivationCompleteRouteIntegrationResult,
) {
  return {
    enabled: result.enabled,
    mode: result.mode,
    ok: result.ok,
    skipped: result.skipped,
    reason: result.reason,
    derivationRunId: result.derivationRunId,
    candidateCount: result.candidateCount,
    resolvedCandidateCount: result.resolvedCandidateCount,
    persistenceDerivationRowsCreated:
      result.persistenceDerivationRowsCreated,
    warnings: result.warnings,
    errors: result.errors,
    idempotency: result.idempotency,
    routeRunner: result.routeRunner,
    config: result.config,
  };
}

function getActorId(event: ActivityEventRow, fallbackActorId: string | null) {
  return (
    event.performed_by_actor_id ??
    event.acting_as_actor_id ??
    event.acting_for_actor_id ??
    fallbackActorId
  );
}

async function fetchActivityEvent(eventId: string, userId: string) {
  const supabaseAny = supabase as any;

  const result = (await supabaseAny
    .from("activity_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle()) as SupabaseQueryResult<ActivityEventRow>;

  return result;
}

async function fetchRouteRunnerRuns(eventId: string) {
  const supabaseAny = supabase as any;

  const result = (await supabaseAny
    .from("category_derivation_runs")
    .select("*")
    .eq("activity_event_id", eventId)
    .eq("schema_version", ROUTE_RUNNER_SCHEMA_VERSION)
    .eq("policy_version", ROUTE_RUNNER_POLICY_VERSION)
    .eq("processor_version", ROUTE_RUNNER_PROCESSOR_VERSION)
    .eq("rule_version", ROUTE_RUNNER_RULE_VERSION)
    .in("status", COMPLETED_RUN_STATUSES)
    .order("created_at", { ascending: true })) as SupabaseListResult<JsonRecord>;

  return result;
}

async function fetchRouteRunnerDerivations(runIds: string[]) {
  if (runIds.length === 0) {
    return {
      data: [],
      error: null,
    } satisfies SupabaseListResult<JsonRecord>;
  }

  const supabaseAny = supabase as any;

  const result = (await supabaseAny
    .from("activity_category_derivations")
    .select("*")
    .in("derivation_run_id", runIds)
    .order("created_at", { ascending: true })) as SupabaseListResult<JsonRecord>;

  return result;
}

function extractRunIds(rows: JsonRecord[]) {
  return rows
    .map((row) => asNonEmptyString(row.id))
    .filter((id): id is string => Boolean(id));
}

function makeDbVerification(params: {
  eventId: string;
  expectedRunId: string | null;
  runs: JsonRecord[];
  derivations: JsonRecord[];
}) {
  const { expectedRunId, runs, derivations } = params;

  const matchingExpectedRunCount = expectedRunId
    ? runs.filter((run) => run.id === expectedRunId).length
    : 0;

  const routeRunnerSpecificRunsCount = runs.length;
  const activityCategoryDerivationsCount = derivations.length;
  const noDuplicateRuns = routeRunnerSpecificRunsCount <= 1;

  return {
    routeRunnerSpecificRunsCount,
    routeRunnerSpecificRunsPass: routeRunnerSpecificRunsCount === 1,
    expectedDerivationRunId: expectedRunId,
    expectedDerivationRunExists: matchingExpectedRunCount === 1,
    expectedDerivationRunActualCount: matchingExpectedRunCount,
    activityCategoryDerivationsCount,
    activityCategoryDerivationsPass: activityCategoryDerivationsCount === 5,
    noDuplicateRuns,
    duplicateRouteRunnerCompletedRunsActualCount: routeRunnerSpecificRunsCount,
    pass:
      routeRunnerSpecificRunsCount === 1 &&
      matchingExpectedRunCount === 1 &&
      activityCategoryDerivationsCount === 5 &&
      noDuplicateRuns,
  };
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  const config = getCategoryDerivationRouteRunnerConfig();

  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    enabled: ACTIVITY_RECORDING_ENABLED,
    expectedMode: EXPECTED_MODE,
    currentConfig: getCategoryDerivationRouteRunnerConfigSummary(config),
    purpose:
      "Debug-only direct adapter idempotency proof endpoint. POST calls the complete-route Category Derivation adapter twice for the same event.",
    safety: {
      modifiesCompleteRoute: false,
      callsOpenAI: false,
      enablesProductionPersist: false,
      createsUi: false,
      createsMigration: false,
    },
  });
}

export async function POST(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 },
    );
  }

  let body: DebugBody;

  try {
    const parsedBody = await request.json();

    if (!isRecord(parsedBody)) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          p4Step: P4_STEP,
          error: "JSON body must be an object.",
        },
        { status: 400 },
      );
    }

    body = parsedBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const eventId = asNonEmptyString(body.eventId);
  const requestedMode = asNonEmptyString(body.mode);
  const callTwice = asBoolean(body.callTwice);

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "eventId is required.",
      },
      { status: 400 },
    );
  }

  if (requestedMode !== EXPECTED_MODE) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "mode must be shadow_persist.",
        expectedMode: EXPECTED_MODE,
        receivedMode: requestedMode,
      },
      { status: 400 },
    );
  }

  if (callTwice !== true) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "callTwice must be true for this idempotency proof.",
      },
      { status: 400 },
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
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "Authenticated app user and person actor context are required.",
      },
      { status: 401 },
    );
  }

  const config = getCategoryDerivationRouteRunnerConfig();
  const configSummary = getCategoryDerivationRouteRunnerConfigSummary(config);

  if (config.mode !== EXPECTED_MODE) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "Local dev server must run with CATEGORY_DERIVATION_ROUTE_RUNNER_MODE=shadow_persist.",
        expectedMode: EXPECTED_MODE,
        currentMode: config.mode,
        currentConfig: configSummary,
      },
      { status: 409 },
    );
  }

  if (!config.shouldPersist || !config.shouldResolve) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "Current Category Derivation config must have shouldPersist=true and shouldResolve=true.",
        currentConfig: configSummary,
      },
      { status: 409 },
    );
  }

  if (config.isProductionPersistMode) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "production_persist must not be enabled for this debug proof.",
        currentConfig: configSummary,
      },
      { status: 409 },
    );
  }

  const eventResult = await fetchActivityEvent(eventId, appUser.id);

  if (eventResult.error || !eventResult.data) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          errorMessage(eventResult.error) ??
          "Activity event was not found for the authenticated app user.",
        eventId,
      },
      { status: 404 },
    );
  }

  const event = eventResult.data;

  if (event.status === "completed") {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "This debug route must use a non-completed event. It does not force-reset completed events.",
        event: {
          id: event.id,
          status: event.status,
          processingStatus: event.processing_status,
          title: event.title,
        },
      },
      { status: 409 },
    );
  }

  const actorId = getActorId(event, personActor.id);

  if (!actorId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "Could not resolve actorId from event or current person actor.",
        event: {
          id: event.id,
          performedByActorId: event.performed_by_actor_id,
          actingAsActorId: event.acting_as_actor_id,
          actingForActorId: event.acting_for_actor_id,
          personActorId: personActor.id,
        },
      },
      { status: 400 },
    );
  }

  const adapterInput = {
    supabase:
      supabase as unknown as CategoryDerivationCompleteRouteIntegrationSupabaseClient,
    activityEvent: {
      id: event.id,
      input_text: event.input_text,
      title: event.title,
      description: event.description,
      duration_minutes: event.duration_minutes,
      source: event.source,
      metadata_json: asRecord(event.metadata_json),
    },
    actorId,
    organizationId: null,
    inputLanguage: null,
    config,
  };

  const firstCall = await runCategoryDerivationForCompleteRoute({
    ...adapterInput,
    metadata: {
      endpoint: ENDPOINT,
      p4Step: P4_STEP,
      call: "first",
      proof: "direct_adapter_idempotency",
      activityEventMetadata: toJsonValue(event.metadata_json),
    },
  });

  const secondCall = await runCategoryDerivationForCompleteRoute({
    ...adapterInput,
    metadata: {
      endpoint: ENDPOINT,
      p4Step: P4_STEP,
      call: "second",
      proof: "direct_adapter_idempotency",
      firstDerivationRunId: firstCall.derivationRunId,
      activityEventMetadata: toJsonValue(event.metadata_json),
    },
  });

  const runsResult = await fetchRouteRunnerRuns(event.id);

  if (runsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: errorMessage(runsResult.error) ?? "Failed to read routeRunner runs.",
        firstCall: compactAdapterResult(firstCall),
        secondCall: compactAdapterResult(secondCall),
      },
      { status: 500 },
    );
  }

  const routeRunnerRuns = runsResult.data ?? [];
  const runIds = extractRunIds(routeRunnerRuns);
  const derivationsResult = await fetchRouteRunnerDerivations(runIds);

  if (derivationsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          errorMessage(derivationsResult.error) ??
          "Failed to read routeRunner activity_category_derivations.",
        firstCall: compactAdapterResult(firstCall),
        secondCall: compactAdapterResult(secondCall),
        routeRunnerRunsCount: routeRunnerRuns.length,
      },
      { status: 500 },
    );
  }

  const routeRunnerDerivations = derivationsResult.data ?? [];
  const dbVerification = makeDbVerification({
    eventId: event.id,
    expectedRunId: firstCall.derivationRunId,
    runs: routeRunnerRuns,
    derivations: routeRunnerDerivations,
  });

  const firstCallPass =
    firstCall.ok === true &&
    firstCall.reason === "route_runner_completed" &&
    typeof firstCall.derivationRunId === "string" &&
    firstCall.derivationRunId.length > 0 &&
    firstCall.persistenceDerivationRowsCreated === 5;

  const secondCallPass =
    secondCall.ok === true &&
    secondCall.reason === "existing_completed_run_found" &&
    secondCall.derivationRunId === firstCall.derivationRunId &&
    secondCall.persistenceDerivationRowsCreated === 0;

  const fullPass = firstCallPass && secondCallPass && dbVerification.pass;

  return NextResponse.json({
    ok: fullPass,
    status: fullPass ? "idempotency_test_pass" : "idempotency_test_failed",
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    event: {
      id: event.id,
      userId: event.user_id,
      status: event.status,
      processingStatus: event.processing_status,
      title: event.title,
      inputText: event.input_text,
      durationMinutes: event.duration_minutes,
      source: event.source,
      metadataJson: event.metadata_json,
    },
    config: configSummary,
    firstCall: compactAdapterResult(firstCall),
    secondCall: compactAdapterResult(secondCall),
    proof: {
      firstCallPass,
      secondCallPass,
      sameDerivationRunId:
        Boolean(firstCall.derivationRunId) &&
        secondCall.derivationRunId === firstCall.derivationRunId,
      firstDerivationRunId: firstCall.derivationRunId,
      secondDerivationRunId: secondCall.derivationRunId,
      secondCallDidNotPersist:
        secondCall.persistenceDerivationRowsCreated === 0,
    },
    dbVerification,
    rows: {
      routeRunnerRuns: routeRunnerRuns.map((row) => ({
        id: row.id ?? null,
        status: row.status ?? null,
        activity_event_id: row.activity_event_id ?? null,
        schema_version: row.schema_version ?? null,
        policy_version: row.policy_version ?? null,
        processor_version: row.processor_version ?? null,
        rule_version: row.rule_version ?? null,
        confidence: row.confidence ?? null,
        input_hash: row.input_hash ?? null,
        created_at: row.created_at ?? null,
        finished_at: row.finished_at ?? null,
      })),
      activityCategoryDerivations: routeRunnerDerivations.map((row) => ({
        id: row.id ?? null,
        derivation_run_id: row.derivation_run_id ?? null,
        activity_event_id: row.activity_event_id ?? null,
        category_id: row.category_id ?? null,
        candidate_slug: row.candidate_slug ?? null,
        candidate_title: row.candidate_title ?? null,
        semantic_layer: row.semantic_layer ?? null,
        category_type: row.category_type ?? null,
        status: row.status ?? null,
        confidence: row.confidence ?? null,
        created_at: row.created_at ?? null,
      })),
    },
    safety: {
      completeRouteModified: false,
      eventCompletedByThisRoute: false,
      productionPersistEnabled: false,
      openAiCalled: false,
      uiCreated: false,
      migrationCreated: false,
    },
  });
}
