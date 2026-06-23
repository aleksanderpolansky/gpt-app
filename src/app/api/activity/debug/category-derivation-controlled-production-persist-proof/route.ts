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
  type CategoryDerivationCompleteRouteIntegrationSupabaseClient,
} from "../../../../../../lib/activity/categoryDerivation/completeRouteIntegration";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const ENDPOINT =
  "/api/activity/debug/category-derivation-controlled-production-persist-proof";

const P4_STEP =
  "P4.10.0-C8-E-F6-E-E-controlled-production-persist-proof";

const PROOF_MARKER =
  "P4.10.0-C8-E-F6-E-controlled-production-persist-proof";

const PROOF_PURPOSE = "controlled_production_persist_proof";
const EXPECTED_MODE = "production_persist";
const EXPECTED_DERIVATION_ROWS = 5;

const ROUTE_RUNNER_SCHEMA_VERSION = "category_derivation_complete_route_v1";
const ROUTE_RUNNER_POLICY_VERSION = "c8-e-f4";
const ROUTE_RUNNER_PROCESSOR_VERSION = "category_derivation_v1";
const ROUTE_RUNNER_RULE_VERSION = "rules_v1";

const COMPLETED_RUN_STATUSES = ["completed", "completed_with_warnings"];

const DEFAULT_INPUT_TEXT =
  "walked to work for 10 minutes during controlled production persist proof";

const DEFAULT_TITLE = "F6-E controlled production_persist proof";
const DEFAULT_DESCRIPTION =
  "Controlled debug-only proof event for Category Derivation production_persist persistence and adapter-level idempotency.";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
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

    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function resolveDurationMinutes(value: unknown): number | null {
  if (typeof value === "undefined" || value === null || value === "") {
    return 10;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0 ||
    numericValue > 24 * 60
  ) {
    return null;
  }

  return Math.round(numericValue);
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

function compactAdapterResult(result: any) {
  return {
    enabled: result.enabled,
    mode: result.mode,
    ok: result.ok,
    skipped: result.skipped,
    reason: result.reason,
    derivationRunId: result.derivationRunId,
    candidateCount: result.candidateCount,
    resolvedCandidateCount: result.resolvedCandidateCount,
    persistenceDerivationRowsCreated: result.persistenceDerivationRowsCreated,
    warnings: result.warnings,
    errors: result.errors,
    idempotency: result.idempotency,
    routeRunner: result.routeRunner,
    config: result.config,
  };
}

function mapActivityEvent(event: any) {
  return {
    id: event.id,
    userId: event.user_id,
    performedByActorId: event.performed_by_actor_id,
    actingAsActorId: event.acting_as_actor_id,
    actingForActorId: event.acting_for_actor_id,
    activityTypeId: event.activity_type_id,
    activityTemplateId: event.activity_template_id,
    legacyTemplateId: event.template_id,
    eventCode: event.event_code,
    inputText: event.input_text,
    title: event.title,
    description: event.description,
    startedAt: event.started_at,
    endedAt: event.ended_at,
    durationMinutes: event.duration_minutes,
    source: event.source,
    status: event.status,
    privacyScope: event.privacy_scope,
    processingStatus: event.processing_status,
    metadataJson: event.metadata_json,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function proofEventHasRequiredMarkers(event: any) {
  const metadata = asRecord(event?.metadata_json);

  return (
    Boolean(event?.id) &&
    metadata?.proof === PROOF_MARKER &&
    metadata?.purpose === PROOF_PURPOSE &&
    metadata?.doNotUseAsCanonicalBusinessEvent === true &&
    metadata?.cleanupEligible === true &&
    metadata?.productionPersistProof === true &&
    metadata?.createdBy === "controlled_proof_route" &&
    metadata?.productionRouteUnderTest === false &&
    metadata?.categoryDerivationRouteUnderTest === true
  );
}

function extractRunIds(rows: JsonRecord[]) {
  return rows
    .map((row) => asNonEmptyString(row.id))
    .filter((id): id is string => Boolean(id));
}

async function createProofActivityEvent(params: {
  userId: string;
  actorId: string;
  inputText: string;
  title: string;
  description: string;
  durationMinutes: number;
}) {
  const startedAt = new Date(
    Date.now() - params.durationMinutes * 60 * 1000,
  ).toISOString();

  const supabaseAny = supabase as any;

  return await supabaseAny
    .from("activity_events")
    .insert({
      user_id: params.userId,
      performed_by_actor_id: params.actorId,
      acting_as_actor_id: params.actorId,
      acting_for_actor_id: params.actorId,
      activity_type_id: null,
      activity_template_id: null,
      template_id: null,
      event_code: null,
      input_text: params.inputText,
      title: params.title,
      description: params.description,
      started_at: startedAt,
      ended_at: null,
      duration_minutes: params.durationMinutes,
      source: "manual_form",
      status: "started",
      privacy_scope: "private",
      processing_status: "pending",
      metadata_json: {
        proof: PROOF_MARKER,
        p4Step: P4_STEP,
        endpoint: ENDPOINT,
        purpose: PROOF_PURPOSE,
        doNotUseAsCanonicalBusinessEvent: true,
        cleanupEligible: true,
        productionPersistProof: true,
        createdBy: "controlled_proof_route",
        productionRouteUnderTest: false,
        categoryDerivationRouteUnderTest: true,
        completeRouteModified: false,
        openAiExpected: false,
        runtimeProofApprovedHere: false,
        sqlCleanupApprovedHere: false,
      },
    })
    .select("*")
    .single();
}

async function fetchActivityEvent(eventId: string, userId: string) {
  const supabaseAny = supabase as any;

  return await supabaseAny
    .from("activity_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
}

async function fetchRouteRunnerRuns(eventId: string) {
  const supabaseAny = supabase as any;

  return await supabaseAny
    .from("category_derivation_runs")
    .select("*")
    .eq("activity_event_id", eventId)
    .eq("schema_version", ROUTE_RUNNER_SCHEMA_VERSION)
    .eq("policy_version", ROUTE_RUNNER_POLICY_VERSION)
    .eq("processor_version", ROUTE_RUNNER_PROCESSOR_VERSION)
    .eq("rule_version", ROUTE_RUNNER_RULE_VERSION)
    .in("status", COMPLETED_RUN_STATUSES)
    .order("created_at", { ascending: true });
}

async function fetchRouteRunnerDerivations(runIds: string[]) {
  if (runIds.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const supabaseAny = supabase as any;

  return await supabaseAny
    .from("activity_category_derivations")
    .select("*")
    .in("derivation_run_id", runIds)
    .order("created_at", { ascending: true });
}

function makeDbVerification(params: {
  proofEvent: any;
  expectedRunId: string | null;
  runs: JsonRecord[];
  derivations: JsonRecord[];
}) {
  const { proofEvent, expectedRunId, runs, derivations } = params;

  const matchingExpectedRunCount = expectedRunId
    ? runs.filter((run) => run.id === expectedRunId).length
    : 0;

  const routeRunnerSpecificRunsCount = runs.length;
  const activityCategoryDerivationsCount = derivations.length;
  const noDuplicateRuns = routeRunnerSpecificRunsCount <= 1;
  const proofEventHasMarkers = proofEventHasRequiredMarkers(proofEvent);

  return {
    pass:
      Boolean(proofEvent?.id) &&
      proofEventHasMarkers &&
      routeRunnerSpecificRunsCount === 1 &&
      matchingExpectedRunCount === 1 &&
      activityCategoryDerivationsCount === EXPECTED_DERIVATION_ROWS &&
      noDuplicateRuns,
    proofEventExists: Boolean(proofEvent?.id),
    proofEventHasRequiredMarkers: proofEventHasMarkers,
    routeRunnerSpecificRunsCount,
    routeRunnerSpecificRunsPass: routeRunnerSpecificRunsCount === 1,
    expectedDerivationRunId: expectedRunId,
    expectedDerivationRunExists: matchingExpectedRunCount === 1,
    expectedDerivationRunActualCount: matchingExpectedRunCount,
    expectedActivityCategoryDerivationsCount: EXPECTED_DERIVATION_ROWS,
    activityCategoryDerivationsCount,
    activityCategoryDerivationsPass:
      activityCategoryDerivationsCount === EXPECTED_DERIVATION_ROWS,
    noDuplicateRuns,
    duplicateRouteRunnerCompletedRunsActualCount: routeRunnerSpecificRunsCount,
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
      "Debug-only controlled production_persist proof route. GET only describes the route; it does not execute the proof.",
    safety: {
      debugOnly: true,
      modifiesCompleteRoute: false,
      callsCompleteRoute: false,
      callsRouteRunnerDirectly: false,
      callsOpenAi: false,
      createsUi: false,
      createsMigration: false,
      changesSchema: false,
      changesRls: false,
      changesPermissions: false,
      runsSql: false,
      runsCleanup: false,
      productionPersistRuntimeApprovedByGet: false,
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

  let body: JsonRecord;

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

  const proof = asNonEmptyString(body.proof);
  const requestedMode = asNonEmptyString(body.mode);
  const callTwice = asBoolean(body.callTwice);
  const durationMinutes = resolveDurationMinutes(body.durationMinutes);
  const inputText = asNonEmptyString(body.inputText) ?? DEFAULT_INPUT_TEXT;
  const title = asNonEmptyString(body.title) ?? DEFAULT_TITLE;
  const description = asNonEmptyString(body.description) ?? DEFAULT_DESCRIPTION;

  if (proof !== PROOF_MARKER) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "proof must be exactly P4.10.0-C8-E-F6-E-controlled-production-persist-proof.",
        expectedProof: PROOF_MARKER,
        receivedProof: proof,
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
        error: "mode must be production_persist.",
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
        error: "callTwice must be true for this controlled proof.",
      },
      { status: 400 },
    );
  }

  if (!durationMinutes) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "durationMinutes must be a positive finite number up to 1440.",
      },
      { status: 400 },
    );
  }

  if (!inputText || !title) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "inputText and title must be non-empty after defaulting.",
      },
      { status: 400 },
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
          "Local dev server must run with CATEGORY_DERIVATION_ROUTE_RUNNER_MODE=production_persist for this controlled proof.",
        expectedMode: EXPECTED_MODE,
        currentMode: config.mode,
        currentConfig: configSummary,
      },
      { status: 409 },
    );
  }

  if (
    !config.isProductionPersistMode ||
    !config.shouldPersist ||
    !config.shouldResolve
  ) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "Current Category Derivation config must be production_persist with shouldPersist=true and shouldResolve=true.",
        currentConfig: configSummary,
      },
      { status: 409 },
    );
  }

  if (config.failActivityComplete !== false) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "CATEGORY_DERIVATION_ROUTE_RUNNER_FAILS_ACTIVITY_COMPLETE must be false for the first controlled production_persist proof.",
        currentConfig: configSummary,
      },
      { status: 409 },
    );
  }

  const createResult = await createProofActivityEvent({
    userId: appUser.id,
    actorId: personActor.id,
    inputText,
    title,
    description,
    durationMinutes,
  });

  if (createResult.error || !createResult.data) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          errorMessage(createResult.error) ??
          "Failed to create controlled production_persist proof activity_event.",
        details: createResult.error?.details ?? null,
        hint: createResult.error?.hint ?? null,
        code: createResult.error?.code ?? null,
      },
      { status: 500 },
    );
  }

  const createdEvent = createResult.data;

  if (!proofEventHasRequiredMarkers(createdEvent)) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "Created proof activity_event does not contain all required proof metadata markers.",
        event: mapActivityEvent(createdEvent),
      },
      { status: 500 },
    );
  }

  const adapterInput = {
    supabase:
      supabase as unknown as CategoryDerivationCompleteRouteIntegrationSupabaseClient,
    activityEvent: {
      id: createdEvent.id,
      input_text: createdEvent.input_text,
      title: createdEvent.title,
      description: createdEvent.description,
      duration_minutes: createdEvent.duration_minutes,
      source: createdEvent.source,
      metadata_json: asRecord(createdEvent.metadata_json),
    },
    actorId: personActor.id,
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
      proof: PROOF_MARKER,
      purpose: PROOF_PURPOSE,
      cleanupEligible: true,
      productionPersistProof: true,
      controlledProductionPersistProof: true,
      activityEventMetadata: createdEvent.metadata_json,
    },
  });

  const secondCall = await runCategoryDerivationForCompleteRoute({
    ...adapterInput,
    metadata: {
      endpoint: ENDPOINT,
      p4Step: P4_STEP,
      call: "second",
      proof: PROOF_MARKER,
      purpose: PROOF_PURPOSE,
      firstDerivationRunId: firstCall.derivationRunId,
      cleanupEligible: true,
      productionPersistProof: true,
      controlledProductionPersistProof: true,
      activityEventMetadata: createdEvent.metadata_json,
    },
  });

  const proofEventResult = await fetchActivityEvent(createdEvent.id, appUser.id);

  if (proofEventResult.error || !proofEventResult.data) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          errorMessage(proofEventResult.error) ??
          "Failed to refetch controlled proof activity_event.",
        eventId: createdEvent.id,
        firstCall: compactAdapterResult(firstCall),
        secondCall: compactAdapterResult(secondCall),
      },
      { status: 500 },
    );
  }

  const proofEvent = proofEventResult.data;
  const runsResult = await fetchRouteRunnerRuns(proofEvent.id);

  if (runsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          errorMessage(runsResult.error) ??
          "Failed to read controlled proof category_derivation_runs.",
        event: mapActivityEvent(proofEvent),
        firstCall: compactAdapterResult(firstCall),
        secondCall: compactAdapterResult(secondCall),
      },
      { status: 500 },
    );
  }

  const routeRunnerRuns = (runsResult.data ?? []) as JsonRecord[];
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
          "Failed to read controlled proof activity_category_derivations.",
        event: mapActivityEvent(proofEvent),
        firstCall: compactAdapterResult(firstCall),
        secondCall: compactAdapterResult(secondCall),
        routeRunnerRunsCount: routeRunnerRuns.length,
      },
      { status: 500 },
    );
  }

  const routeRunnerDerivations = (derivationsResult.data ?? []) as JsonRecord[];

  const dbVerification = makeDbVerification({
    proofEvent,
    expectedRunId: firstCall.derivationRunId,
    runs: routeRunnerRuns,
    derivations: routeRunnerDerivations,
  });

  const firstCallPass =
    firstCall.ok === true &&
    firstCall.reason === "route_runner_completed" &&
    typeof firstCall.derivationRunId === "string" &&
    firstCall.derivationRunId.length > 0 &&
    firstCall.persistenceDerivationRowsCreated === EXPECTED_DERIVATION_ROWS &&
    firstCall.routeRunner.executed === true &&
    firstCall.routeRunner.persisted === true;

  const secondCallPass =
    secondCall.ok === true &&
    secondCall.reason === "existing_completed_run_found" &&
    secondCall.derivationRunId === firstCall.derivationRunId &&
    secondCall.persistenceDerivationRowsCreated === 0 &&
    secondCall.routeRunner.executed === false &&
    secondCall.routeRunner.persisted === false;

  const sameDerivationRunId =
    Boolean(firstCall.derivationRunId) &&
    secondCall.derivationRunId === firstCall.derivationRunId;

  const proofObject = {
    firstCallPass,
    secondCallPass,
    sameDerivationRunId,
    firstDerivationRunId: firstCall.derivationRunId,
    secondDerivationRunId: secondCall.derivationRunId,
    secondCallDidNotPersist: secondCall.persistenceDerivationRowsCreated === 0,
    productionPersistActuallyUsed:
      config.mode === EXPECTED_MODE && config.isProductionPersistMode === true,
    eventWasProofMarked: proofEventHasRequiredMarkers(proofEvent),
  };

  const safety = {
    completeRouteModified: false,
    completeRouteCalled: false,
    eventCompletedByThisRoute: false,
    productionPersistEnabled: config.isProductionPersistMode,
    productionPersistAllowedOnlyForThisDebugProof: true,
    failActivityComplete: config.failActivityComplete,
    openAiCalled: false,
    uiCreated: false,
    migrationCreated: false,
    schemaChanged: false,
    rlsChanged: false,
    permissionsChanged: false,
    sqlExecutedByPowerShell: false,
    cleanupEligible: true,
    debugOnly: true,
    nonCanonicalBusinessEvent: true,
  };

  const fullPass =
    firstCallPass &&
    secondCallPass &&
    sameDerivationRunId &&
    proofObject.secondCallDidNotPersist &&
    proofObject.productionPersistActuallyUsed &&
    proofObject.eventWasProofMarked &&
    dbVerification.pass;

  return NextResponse.json({
    ok: fullPass,
    status: fullPass
      ? "controlled_production_persist_proof_pass"
      : "controlled_production_persist_proof_fail",
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    route: ENDPOINT,
    event: mapActivityEvent(proofEvent),
    config: {
      mode: config.mode,
      isProductionPersistMode: config.isProductionPersistMode,
      shouldPersist: config.shouldPersist,
      shouldResolve: config.shouldResolve,
      failActivityComplete: config.failActivityComplete,
      includeResponseDebug: config.includeResponseDebug,
      summary: configSummary,
    },
    firstCall: compactAdapterResult(firstCall),
    secondCall: compactAdapterResult(secondCall),
    proof: proofObject,
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
    safety,
  });
}
