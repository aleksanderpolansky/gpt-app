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
  "/api/activity/debug/category-derivation-complete-route-adapter-failure-test";

const P4_STEP = "P4.10.0-C8-E-F5-G-F-C";

const EXPECTED_MODE = "shadow_persist";

const SUPPORTED_SCENARIOS = [
  "missing_activity_event_id",
  "missing_actor_id",
  "simulated_persistence_failure",
] as const;

type SupportedScenario = (typeof SUPPORTED_SCENARIOS)[number];

type JsonRecord = Record<string, unknown>;

type DebugBody = {
  scenario?: unknown;
  mode?: unknown;
  expectFailActivityComplete?: unknown;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function isSupportedScenario(value: string | null): value is SupportedScenario {
  return Boolean(
    value &&
      (SUPPORTED_SCENARIOS as readonly string[]).includes(value),
  );
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

function expectedReasonForScenario(scenario: SupportedScenario) {
  if (scenario === "missing_actor_id") {
    return "missing_actor_id";
  }

  if (scenario === "simulated_persistence_failure") {
    return "simulated_persistence_failure";
  }

  return "missing_activity_event_id";
}

function errorMatchesScenario(params: {
  scenario: SupportedScenario;
  reason: unknown;
  errors: string[];
}) {
  const expectedReason = expectedReasonForScenario(params.scenario);

  const actualReason =
    typeof params.reason === "string"
      ? params.reason.toLowerCase()
      : "";

  if (actualReason === expectedReason) {
    return true;
  }

  const joinedErrors = params.errors.join(" ").toLowerCase();

  if (params.scenario === "missing_actor_id") {
    return joinedErrors.includes("actor") && joinedErrors.includes("required");
  }

  return (
    joinedErrors.includes("activityevent.id") ||
    (joinedErrors.includes("activity") &&
      joinedErrors.includes("event") &&
      joinedErrors.includes("required"))
  );
}

function buildExpectedResultChecks(params: {
  scenario: SupportedScenario;
  result: CategoryDerivationCompleteRouteIntegrationResult;
  failActivityComplete: boolean;
}) {
  const { scenario, result, failActivityComplete } = params;
  const expectedOk = !failActivityComplete;
  const expectedReason = expectedReasonForScenario(scenario);
  const isSimulatedPersistenceFailure =
    scenario === "simulated_persistence_failure";

  const checks = [
    {
      name: "adapter result ok follows !failActivityComplete",
      pass: result.ok === expectedOk,
    },
    {
      name: `adapter skipped is ${!isSimulatedPersistenceFailure}`,
      pass: result.skipped === !isSimulatedPersistenceFailure,
    },
    {
      name: `adapter reason is ${expectedReason}`,
      pass: result.reason === expectedReason,
    },
    {
      name: "derivationRunId is null",
      pass: result.derivationRunId === null,
    },
    {
      name: isSimulatedPersistenceFailure
        ? "candidateCount is greater than 0"
        : "candidateCount is 0",
      pass: isSimulatedPersistenceFailure
        ? result.candidateCount > 0
        : result.candidateCount === 0,
    },
    {
      name: "resolvedCandidateCount is 0",
      pass: result.resolvedCandidateCount === 0,
    },
    {
      name: "persistenceDerivationRowsCreated is 0",
      pass: result.persistenceDerivationRowsCreated === 0,
    },
    {
      name: `routeRunner.executed is ${isSimulatedPersistenceFailure}`,
      pass: result.routeRunner.executed === isSimulatedPersistenceFailure,
    },
    {
      name: "routeRunner.persisted is false",
      pass: result.routeRunner.persisted === false,
    },
    {
      name: "routeRunner.resolved is false",
      pass: result.routeRunner.resolved === false,
    },
    {
      name: `validation signal matches ${expectedReason}`,
      pass: errorMatchesScenario({
        scenario,
        reason: result.reason,
        errors: result.errors,
      }),
    },
  ];

  return {
    scenario,
    expectedOk,
    expectedReason,
    checks,
    pass: checks.every((check) => check.pass),
  };
}

function buildAdapterActivityEvent(scenario: SupportedScenario) {
  return {
    id:
      scenario === "missing_activity_event_id"
        ? ""
        : "00000000-0000-4000-8000-0000000000e5",
    input_text: "walked to work for 15 minutes",
    title:
      scenario === "simulated_persistence_failure"
        ? "F5-G-F simulated persistence failure proof"
        : scenario === "missing_actor_id"
          ? "F5-G-E-B missing actor id validation failure proof"
          : "F5-G-C-B missing activity event id validation failure proof",
    description:
      scenario === "simulated_persistence_failure"
        ? "Debug-only adapter failure proof. Persistence failure is simulated before run creation."
        : scenario === "missing_actor_id"
          ? "Debug-only adapter validation proof. actorId is intentionally empty."
          : "Debug-only adapter validation proof. activityEvent.id is intentionally empty.",
    duration_minutes: 15,
    source: "manual",
    metadata_json: {
      endpoint: ENDPOINT,
      p4Step: P4_STEP,
      scenario,
      doNotUseAsCanonicalProof: true,
    },
  };
}

function buildAdapterActorId(scenario: SupportedScenario, personActorId: string) {
  if (scenario === "missing_actor_id") {
    return "";
  }

  return personActorId;
}

export async function GET() {
  const config = getCategoryDerivationRouteRunnerConfig();

  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    enabled: ACTIVITY_RECORDING_ENABLED,
    expectedMode: EXPECTED_MODE,
    supportedScenarios: SUPPORTED_SCENARIOS,
    currentConfig: getCategoryDerivationRouteRunnerConfigSummary(config),
    purpose:
      "Debug-only adapter validation failure endpoint. It calls the complete-route Category Derivation adapter with controlled invalid input and verifies structured non-persistent failure behavior.",
    safety: {
      modifiesCompleteRoute: false,
      completesActivityEvent: false,
      createsUi: false,
      createsMigration: false,
      callsOpenAI: false,
      enablesProductionPersist: false,
      corruptsSchemaOrPermissions: false,
    },
  });
}

export async function POST(request: Request) {
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

  const requestedMode = asNonEmptyString(body.mode);
  const scenario = asNonEmptyString(body.scenario);
  const expectedFailActivityComplete = asBoolean(
    body.expectFailActivityComplete,
  );

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

  if (!isSupportedScenario(scenario)) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "Unsupported scenario.",
        supportedScenarios: SUPPORTED_SCENARIOS,
        receivedScenario: scenario,
      },
      { status: 400 },
    );
  }

  if (expectedFailActivityComplete !== false) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "This first failure-behavior proof requires expectFailActivityComplete=false.",
        receivedExpectFailActivityComplete: expectedFailActivityComplete,
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

  if (config.failActivityComplete !== false) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error:
          "This first failure-behavior proof requires CATEGORY_DERIVATION_ROUTE_RUNNER_FAILS_ACTIVITY_COMPLETE=false.",
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
          "Current Category Derivation config must have shouldPersist=true and shouldResolve=true for shadow_persist validation proof.",
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

  const adapterResult = await runCategoryDerivationForCompleteRoute({
    supabase:
      supabase as unknown as CategoryDerivationCompleteRouteIntegrationSupabaseClient,
    activityEvent: buildAdapterActivityEvent(scenario),
    actorId: buildAdapterActorId(scenario, personActor.id),
    organizationId: null,
    inputLanguage: null,
    config,
    metadata: {
      endpoint: ENDPOINT,
      p4Step: P4_STEP,
      scenario,
      proof: "adapter_validation_failure",
      expectedFailure: expectedReasonForScenario(scenario),
      simulatePersistenceFailure:
        scenario === "simulated_persistence_failure"
          ? "before_run_create"
          : null,
      doNotUseAsCanonicalProof: true,
    },
  });

  const expectedChecks = buildExpectedResultChecks({
    scenario,
    result: adapterResult,
    failActivityComplete: config.failActivityComplete,
  });

  const expectedReason = expectedReasonForScenario(scenario);

  const expectedSkipped = scenario !== "simulated_persistence_failure";

  const fullPass =
    expectedChecks.pass &&
    adapterResult.ok === !config.failActivityComplete &&
    adapterResult.skipped === expectedSkipped &&
    adapterResult.reason === expectedReason &&
    adapterResult.derivationRunId === null &&
    adapterResult.persistenceDerivationRowsCreated === 0;

  return NextResponse.json({
    ok: fullPass,
    status: fullPass
      ? "adapter_validation_failure_test_pass"
      : "adapter_validation_failure_test_failed",
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    scenario,
    event: {
      intentionallyMissingActivityEventId:
        scenario === "missing_activity_event_id",
      intentionallyMissingActorId: scenario === "missing_actor_id",
      intentionallySimulatedPersistenceFailure:
        scenario === "simulated_persistence_failure",
      completedByThisRoute: false,
      persistedByThisRoute: false,
    },
    config: configSummary,
    adapterResult: compactAdapterResult(adapterResult),
    expectedChecks,
    safety: {
      completeRouteModified: false,
      activityEventCompletedByThisRoute: false,
      categoryDerivationRunCreated: false,
      activityCategoryDerivationsCreated: false,
      productionPersistEnabled: false,
      openAiCalled: false,
      uiCreated: false,
      migrationCreated: false,
      schemaOrPermissionsModified: false,
    },
  });
}
