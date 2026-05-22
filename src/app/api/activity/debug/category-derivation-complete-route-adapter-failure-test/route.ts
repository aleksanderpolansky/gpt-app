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

const P4_STEP = "P4.10.0-C8-E-F5-G-C-A";

const EXPECTED_MODE = "shadow_persist";

const SUPPORTED_SCENARIOS = ["missing_activity_event_id"] as const;

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

function buildExpectedResultChecks(params: {
  scenario: SupportedScenario;
  result: CategoryDerivationCompleteRouteIntegrationResult;
  failActivityComplete: boolean;
}) {
  const { scenario, result, failActivityComplete } = params;

  if (scenario === "missing_activity_event_id") {
    const expectedOk = !failActivityComplete;

    const checks = [
      {
        name: "adapter result ok follows !failActivityComplete",
        pass: result.ok === expectedOk,
      },
      {
        name: "adapter skipped is true",
        pass: result.skipped === true,
      },
      {
        name: "adapter reason is missing_activity_event_id",
        pass: result.reason === "missing_activity_event_id",
      },
      {
        name: "derivationRunId is null",
        pass: result.derivationRunId === null,
      },
      {
        name: "candidateCount is 0",
        pass: result.candidateCount === 0,
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
        name: "routeRunner.executed is false",
        pass: result.routeRunner.executed === false,
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
        name: "errors include missing activityEvent.id",
        pass: result.errors.some((error) =>
          error.includes("activityEvent.id is required"),
        ),
      },
    ];

    return {
      scenario,
      expectedOk,
      checks,
      pass: checks.every((check) => check.pass),
    };
  }

  const fallbackChecks = [
    {
      name: "unsupported scenario should never reach adapter execution",
      pass: false,
    },
  ];

  return {
    scenario,
    expectedOk: false,
    checks: fallbackChecks,
    pass: false,
  };
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
    activityEvent: {
      id: "",
      input_text: "walked to work for 15 minutes",
      title: "F5-G-C-B missing activity event id validation failure proof",
      description:
        "Debug-only adapter validation proof. activityEvent.id is intentionally empty.",
      duration_minutes: 15,
      source: "manual",
      metadata_json: {
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        scenario,
        doNotUseAsCanonicalProof: true,
      },
    },
    actorId: personActor.id,
    organizationId: null,
    inputLanguage: null,
    config,
    metadata: {
      endpoint: ENDPOINT,
      p4Step: P4_STEP,
      scenario,
      proof: "adapter_validation_failure",
      expectedFailure: "missing_activity_event_id",
      doNotUseAsCanonicalProof: true,
    },
  });

  const expectedChecks = buildExpectedResultChecks({
    scenario,
    result: adapterResult,
    failActivityComplete: config.failActivityComplete,
  });

  const fullPass =
    expectedChecks.pass &&
    adapterResult.ok === true &&
    adapterResult.skipped === true &&
    adapterResult.reason === "missing_activity_event_id" &&
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
      intentionallyMissingActivityEventId: true,
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
