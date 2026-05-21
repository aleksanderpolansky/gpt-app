import {
  getCategoryDerivationRouteRunnerConfig,
  getCategoryDerivationRouteRunnerConfigSummary,
  type CategoryDerivationRouteRunnerConfig,
} from "./config";
import {
  DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_POLICY_VERSION,
  DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_SCHEMA_VERSION,
  DEFAULT_CATEGORY_DERIVATION_PROCESSOR_VERSION,
  DEFAULT_CATEGORY_DERIVATION_RULE_VERSION,
  findExistingCompletedCategoryDerivationRunForActivityEvent,
  summarizeExistingCompletedCategoryDerivationRunLookup,
  type CategoryDerivationRunLookupClient,
  type FindExistingCompletedCategoryDerivationRunResult,
} from "./runLookup";
import {
  runCategoryDerivationRoute,
  type CategoryDerivationRouteRunnerSupabaseClient,
  type RunCategoryDerivationRouteResult,
} from "./routeRunner";
import type { JsonRecord, JsonValue } from "./types";

export type CategoryDerivationCompleteRouteIntegrationSupabaseClient =
  CategoryDerivationRouteRunnerSupabaseClient & CategoryDerivationRunLookupClient;

export interface CategoryDerivationCompleteRouteActivityEvent {
  id?: string | null;
  input_text?: string | null;
  title?: string | null;
  description?: string | null;
  duration_minutes?: number | null;
  source?: string | null;
  metadata_json?: Record<string, unknown> | null;
}

export interface RunCategoryDerivationForCompleteRouteInput {
  supabase: CategoryDerivationCompleteRouteIntegrationSupabaseClient;
  activityEvent: CategoryDerivationCompleteRouteActivityEvent;
  actorId: string | null;
  organizationId?: string | null;
  inputLanguage?: string | null;
  config?: CategoryDerivationRouteRunnerConfig;
  schemaVersion?: string;
  policyVersion?: string;
  processorVersion?: string;
  ruleVersion?: string;
  metadata?: JsonRecord;
}

export type CategoryDerivationCompleteRouteIntegrationReason =
  | "disabled"
  | "debug_only"
  | "legacy_existing_mode_selected"
  | "missing_activity_event_id"
  | "missing_input_text"
  | "missing_actor_id"
  | "existing_completed_run_found"
  | "route_runner_completed"
  | "route_runner_failed"
  | "lookup_error"
  | "not_route_runner_mode";

export interface CategoryDerivationCompleteRouteIntegrationResult {
  enabled: boolean;
  mode: string;
  ok: boolean;
  skipped: boolean;
  reason: CategoryDerivationCompleteRouteIntegrationReason;
  derivationRunId: string | null;
  candidateCount: number;
  resolvedCandidateCount: number;
  persistenceDerivationRowsCreated: number;
  warnings: string[];
  errors: string[];
  config: ReturnType<typeof getCategoryDerivationRouteRunnerConfigSummary>;
  idempotency: ReturnType<
    typeof summarizeExistingCompletedCategoryDerivationRunLookup
  > | null;
  routeRunner: {
    executed: boolean;
    persisted: boolean;
    resolved: boolean;
  };
  debug: unknown | null;
}

function asJsonRecord(value: JsonRecord | null | undefined): JsonRecord {
  return value ?? {};
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: JsonRecord = {};

    for (const key of Object.keys(source)) {
      const item = source[key];

      if (typeof item !== "undefined") {
        result[key] = toJsonValue(item);
      }
    }

    return result;
  }

  return String(value);
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getActivityEventInputText(
  activityEvent: CategoryDerivationCompleteRouteActivityEvent,
): string | null {
  return (
    normalizeText(activityEvent.input_text) ??
    normalizeText(activityEvent.title) ??
    normalizeText(activityEvent.description)
  );
}

function baseResult(params: {
  config: CategoryDerivationRouteRunnerConfig;
  ok: boolean;
  skipped: boolean;
  reason: CategoryDerivationCompleteRouteIntegrationReason;
  derivationRunId?: string | null;
  candidateCount?: number;
  resolvedCandidateCount?: number;
  persistenceDerivationRowsCreated?: number;
  warnings?: string[];
  errors?: string[];
  idempotency?: FindExistingCompletedCategoryDerivationRunResult | null;
  routeRunnerExecuted?: boolean;
  routeRunnerPersisted?: boolean;
  routeRunnerResolved?: boolean;
  debug?: unknown | null;
}): CategoryDerivationCompleteRouteIntegrationResult {
  return {
    enabled: !params.config.isDisabled,
    mode: params.config.mode,
    ok: params.ok,
    skipped: params.skipped,
    reason: params.reason,
    derivationRunId: params.derivationRunId ?? null,
    candidateCount: params.candidateCount ?? 0,
    resolvedCandidateCount: params.resolvedCandidateCount ?? 0,
    persistenceDerivationRowsCreated:
      params.persistenceDerivationRowsCreated ?? 0,
    warnings: [...params.config.warnings, ...(params.warnings ?? [])],
    errors: params.errors ?? [],
    config: getCategoryDerivationRouteRunnerConfigSummary(params.config),
    idempotency: params.idempotency
      ? summarizeExistingCompletedCategoryDerivationRunLookup(
          params.idempotency,
        )
      : null,
    routeRunner: {
      executed: params.routeRunnerExecuted ?? false,
      persisted: params.routeRunnerPersisted ?? false,
      resolved: params.routeRunnerResolved ?? false,
    },
    debug: params.config.includeResponseDebug ? params.debug ?? null : null,
  };
}

function mapRouteRunnerResult(params: {
  config: CategoryDerivationRouteRunnerConfig;
  routeRunnerResult: RunCategoryDerivationRouteResult;
  idempotency: FindExistingCompletedCategoryDerivationRunResult | null;
}): CategoryDerivationCompleteRouteIntegrationResult {
  const rowsCreated = params.routeRunnerResult.persistence.rows?.rowsCreated ?? 0;

  return baseResult({
    config: params.config,
    ok: params.routeRunnerResult.ok,
    skipped: false,
    reason: params.routeRunnerResult.ok
      ? "route_runner_completed"
      : "route_runner_failed",
    derivationRunId: params.routeRunnerResult.derivationRunId,
    candidateCount: params.routeRunnerResult.candidates.length,
    resolvedCandidateCount: params.routeRunnerResult.resolvedCandidates.length,
    persistenceDerivationRowsCreated: rowsCreated,
    warnings: params.routeRunnerResult.warnings,
    errors: params.routeRunnerResult.errors,
    idempotency: params.idempotency,
    routeRunnerExecuted: true,
    routeRunnerPersisted: params.routeRunnerResult.persisted,
    routeRunnerResolved: params.routeRunnerResult.resolved,
    debug: {
      routeRunnerResult: params.routeRunnerResult,
    },
  });
}

export async function runCategoryDerivationForCompleteRoute(
  params: RunCategoryDerivationForCompleteRouteInput,
): Promise<CategoryDerivationCompleteRouteIntegrationResult> {
  const config = params.config ?? getCategoryDerivationRouteRunnerConfig();

  if (config.isDisabled) {
    return baseResult({
      config,
      ok: true,
      skipped: true,
      reason: "disabled",
    });
  }

  if (config.isDebugOnly) {
    return baseResult({
      config,
      ok: true,
      skipped: true,
      reason: "debug_only",
    });
  }

  if (config.usesLegacyExistingCompleteRouteFlow) {
    return baseResult({
      config,
      ok: true,
      skipped: true,
      reason: "legacy_existing_mode_selected",
    });
  }

  if (!config.usesRouteRunnerInCompleteRoute) {
    return baseResult({
      config,
      ok: true,
      skipped: true,
      reason: "not_route_runner_mode",
    });
  }

  const activityEventId = normalizeText(params.activityEvent.id);

  if (!activityEventId) {
    return baseResult({
      config,
      ok: !config.failActivityComplete,
      skipped: true,
      reason: "missing_activity_event_id",
      errors: ["activityEvent.id is required for Category Derivation."],
    });
  }

  const inputText = getActivityEventInputText(params.activityEvent);

  if (!inputText) {
    return baseResult({
      config,
      ok: true,
      skipped: true,
      reason: "missing_input_text",
      derivationRunId: null,
    });
  }

  const actorId = normalizeText(params.actorId);

  if (!actorId) {
    return baseResult({
      config,
      ok: true,
      skipped: true,
      reason: "missing_actor_id",
      derivationRunId: null,
    });
  }

  const schemaVersion =
    normalizeText(params.schemaVersion) ??
    DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_SCHEMA_VERSION;

  const policyVersion =
    normalizeText(params.policyVersion) ??
    DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_POLICY_VERSION;

  const processorVersion =
    normalizeText(params.processorVersion) ??
    DEFAULT_CATEGORY_DERIVATION_PROCESSOR_VERSION;

  const ruleVersion =
    normalizeText(params.ruleVersion) ??
    DEFAULT_CATEGORY_DERIVATION_RULE_VERSION;

  let idempotency: FindExistingCompletedCategoryDerivationRunResult | null =
    null;

  if (config.shouldPersist) {
    idempotency =
      await findExistingCompletedCategoryDerivationRunForActivityEvent(
        params.supabase,
        {
          activityEventId,
          processorVersion,
          ruleVersion,
          schemaVersion,
          policyVersion,
        },
      );

    if (!idempotency.ok) {
      const result = baseResult({
        config,
        ok: !config.failActivityComplete,
        skipped: false,
        reason: "lookup_error",
        warnings: idempotency.warnings,
        errors: idempotency.errors,
        idempotency,
        debug: {
          idempotency,
        },
      });

      if (config.failActivityComplete) {
        return result;
      }
    }

    if (idempotency.found) {
      return baseResult({
        config,
        ok: true,
        skipped: true,
        reason: "existing_completed_run_found",
        derivationRunId: idempotency.derivationRunId,
        warnings: idempotency.warnings,
        errors: idempotency.errors,
        idempotency,
        debug: {
          idempotency,
        },
      });
    }
  }

  const routeRunnerResult = await runCategoryDerivationRoute({
    supabase: params.supabase,
    activityEventId,
    input: {
      activityEventId,
      inputText,
      title: normalizeText(params.activityEvent.title),
      description: normalizeText(params.activityEvent.description),
      durationMinutes: normalizeNumber(params.activityEvent.duration_minutes),
      inputLanguage: normalizeText(params.inputLanguage),
      actorId,
      organizationId: normalizeText(params.organizationId),
      metadata: {
        source: "complete_route_integration_adapter",
        activityEventSource: normalizeText(params.activityEvent.source),
        activityEventMetadata: toJsonValue(params.activityEvent.metadata_json),
        adapterMetadata: asJsonRecord(params.metadata),
      },
    },
    resolverOptions: {
      createPolicy: "suggested_only",
      defaultStatus: "suggested",
      sourceType: "category_derivation_complete_route",
    },
    modelName: null,
    modelAlias: null,
    promptVersion: null,
    schemaVersion,
    policyVersion,
    persist: config.shouldPersist,
    resolve: config.shouldResolve,
    metadata: {
      source: "complete_route_integration_adapter",
      schemaVersion,
      policyVersion,
      processorVersion,
      ruleVersion,
      config: getCategoryDerivationRouteRunnerConfigSummary(config),
      adapterMetadata: asJsonRecord(params.metadata),
    },
  });

  return mapRouteRunnerResult({
    config,
    routeRunnerResult,
    idempotency,
  });
}
