import { deriveCategoryCandidates } from "./ruleExtractor";
import {
  resolveCategoryCandidates,
  type CategoryResolverOptions,
  type CategoryResolverSupabaseClient,
} from "./resolver";
import {
  createCategoryDerivationRun,
  failCategoryDerivationRun,
  finishCategoryDerivationRun,
  persistActivityCategoryDerivations,
  type CategoryDerivationPersistenceClient,
  type CreateCategoryDerivationRunResult,
  type PersistActivityCategoryDerivationsResult,
  type UpdateCategoryDerivationRunResult,
} from "./persistence";
import type {
  CategoryCandidate,
  CategoryDerivationInput,
  CategoryDerivationResult,
  CategoryResolutionResult,
  JsonRecord,
  JsonValue,
  ResolvedCategoryCandidate,
} from "./types";

export type CategoryDerivationRouteRunnerSupabaseClient =
  CategoryResolverSupabaseClient & CategoryDerivationPersistenceClient;

export interface RunCategoryDerivationRouteInput {
  supabase: CategoryDerivationRouteRunnerSupabaseClient;
  activityEventId: string;
  input: CategoryDerivationInput;
  resolverOptions?: CategoryResolverOptions;
  modelName?: string | null;
  modelAlias?: string | null;
  promptVersion?: string | null;
  schemaVersion?: string | null;
  policyVersion?: string | null;
  persist?: boolean;
  resolve?: boolean;
  metadata?: JsonRecord;
}

export interface RunCategoryDerivationRouteResult {
  ok: boolean;
  activityEventId: string;
  persisted: boolean;
  resolved: boolean;
  derivationRunId: string | null;
  derivation: CategoryDerivationResult;
  resolution: CategoryResolutionResult | null;
  persistence: {
    runCreate: CreateCategoryDerivationRunResult | null;
    rows: PersistActivityCategoryDerivationsResult | null;
    runFinish: UpdateCategoryDerivationRunResult | null;
    runFail: UpdateCategoryDerivationRunResult | null;
  };
  candidates: CategoryCandidate[];
  resolvedCandidates: ResolvedCategoryCandidate[];
  warnings: string[];
  errors: string[];
  metadata: JsonRecord;
}

function asJsonRecord(value: JsonRecord | null | undefined): JsonRecord {
  return value ?? {};
}

function jsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => jsonValue(item));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: JsonRecord = {};

    for (const key of Object.keys(source)) {
      const item = source[key];

      if (typeof item !== "undefined") {
        result[key] = jsonValue(item);
      }
    }

    return result;
  }

  return String(value);
}

function countResolved(candidates: ResolvedCategoryCandidate[]): number {
  return candidates.filter((candidate) => Boolean(candidate.categoryId)).length;
}

function countUnresolved(candidates: ResolvedCategoryCandidate[]): number {
  return candidates.filter((candidate) => !candidate.categoryId).length;
}

function shouldPersist(input: RunCategoryDerivationRouteInput): boolean {
  return input.persist !== false;
}

function shouldResolve(input: RunCategoryDerivationRouteInput): boolean {
  return input.resolve !== false;
}

function buildOutputJson(params: {
  derivation: CategoryDerivationResult;
  resolution: CategoryResolutionResult | null;
  persistenceRows: PersistActivityCategoryDerivationsResult | null;
  metadata?: JsonRecord;
}): JsonRecord {
  return {
    derivation: {
      ok: params.derivation.ok,
      skipped: params.derivation.skipped ?? false,
      skipReason: params.derivation.skipReason ?? null,
      processorVersion: params.derivation.processorVersion,
      ruleVersion: params.derivation.ruleVersion ?? null,
      confidence: params.derivation.confidence ?? null,
      candidateCount: params.derivation.candidates.length,
      warnings: params.derivation.warnings,
      errors: params.derivation.errors,
      metadata: asJsonRecord(params.derivation.metadata),
    },
    resolution: params.resolution
      ? {
          ok: params.resolution.ok,
          candidateCount: params.resolution.candidates.length,
          createdCount: params.resolution.createdCount,
          reusedCount: params.resolution.reusedCount,
          unresolvedCount: params.resolution.unresolvedCount,
          resolvedCount: countResolved(params.resolution.candidates),
          warnings: params.resolution.warnings,
          errors: params.resolution.errors,
          metadata: asJsonRecord(params.resolution.metadata),
        }
      : null,
    persistenceRows: params.persistenceRows
      ? {
          ok: params.persistenceRows.ok,
          rowsCreated: params.persistenceRows.rowsCreated,
          resolvedCount: params.persistenceRows.resolvedCount,
          unresolvedCount: params.persistenceRows.unresolvedCount,
          needsReviewCount: params.persistenceRows.needsReviewCount,
          warnings: params.persistenceRows.warnings,
          errors: params.persistenceRows.errors,
        }
      : null,
    metadata: asJsonRecord(params.metadata),
  };
}

function resultMetadata(params: {
  resolverOptions?: CategoryResolverOptions;
  persist: boolean;
  resolve: boolean;
  metadata?: JsonRecord;
}): JsonRecord {
  return {
    routeRunner: "categoryDerivationRouteRunner",
    routeRunnerVersion: "c8-e-f1-b",
    persist: params.persist,
    resolve: params.resolve,
    resolverOptions: jsonValue(params.resolverOptions ?? {}),
    metadata: asJsonRecord(params.metadata),
  };
}

function getStringProperty(record: JsonRecord | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function getRecordProperty(record: JsonRecord | null | undefined, key: string): JsonRecord | null {
  const value = record?.[key];

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as JsonRecord;
  }

  return null;
}

function getDebugSimulatedPersistenceFailure(metadata?: JsonRecord): string | null {
  const directValue = getStringProperty(metadata, "simulatePersistenceFailure");
  if (directValue) {
    return directValue;
  }

  const directAdapterMetadata = getRecordProperty(metadata, "adapterMetadata");
  const directAdapterValue = getStringProperty(
    directAdapterMetadata,
    "simulatePersistenceFailure",
  );

  if (directAdapterValue) {
    return directAdapterValue;
  }

  const nestedMetadata = getRecordProperty(metadata, "metadata");
  const nestedMetadataValue = getStringProperty(
    nestedMetadata,
    "simulatePersistenceFailure",
  );

  if (nestedMetadataValue) {
    return nestedMetadataValue;
  }

  const nestedAdapterMetadata = getRecordProperty(
    nestedMetadata,
    "adapterMetadata",
  );

  return getStringProperty(
    nestedAdapterMetadata,
    "simulatePersistenceFailure",
  );
}

function makeFailureResult(params: {
  activityEventId: string;
  derivation: CategoryDerivationResult;
  runCreate: CreateCategoryDerivationRunResult | null;
  runFail: UpdateCategoryDerivationRunResult | null;
  error: string;
  warnings?: string[];
  metadata?: JsonRecord;
}): RunCategoryDerivationRouteResult {
  return {
    ok: false,
    activityEventId: params.activityEventId,
    persisted: Boolean(params.runCreate?.ok),
    resolved: false,
    derivationRunId: params.runCreate?.derivationRunId ?? null,
    derivation: params.derivation,
    resolution: null,
    persistence: {
      runCreate: params.runCreate,
      rows: null,
      runFinish: null,
      runFail: params.runFail,
    },
    candidates: params.derivation.candidates,
    resolvedCandidates: [],
    warnings: params.warnings ?? [],
    errors: [params.error],
    metadata: asJsonRecord(params.metadata),
  };
}



export async function runCategoryDerivationRoute(
  input: RunCategoryDerivationRouteInput,
): Promise<RunCategoryDerivationRouteResult> {
  const routeInput: CategoryDerivationInput = {
    ...input.input,
    activityEventId: input.activityEventId,
  };

  const persistEnabled = shouldPersist(input);
  const resolveEnabled = shouldResolve(input);

  const derivation = deriveCategoryCandidates(routeInput);
  const warnings: string[] = [...derivation.warnings];
  const errors: string[] = [...derivation.errors];

  let runCreate: CreateCategoryDerivationRunResult | null = null;
  let runFinish: UpdateCategoryDerivationRunResult | null = null;
  let runFail: UpdateCategoryDerivationRunResult | null = null;
  let resolution: CategoryResolutionResult | null = null;
  let persistedRows: PersistActivityCategoryDerivationsResult | null = null;

  const metadata = resultMetadata({
    resolverOptions: input.resolverOptions,
    persist: persistEnabled,
    resolve: resolveEnabled,
    metadata: input.metadata,
  });

  const simulatedPersistenceFailure =
    getDebugSimulatedPersistenceFailure(metadata);

  if (
    persistEnabled &&
    simulatedPersistenceFailure === "before_run_create"
  ) {
    return makeFailureResult({
      activityEventId: input.activityEventId,
      derivation,
      runCreate: null,
      runFail: null,
      error: "simulated_persistence_failure",
      warnings,
      metadata: {
        ...metadata,
        simulatedPersistenceFailure,
        simulatedPersistenceFailureBoundary: "before_run_create",
      },
    });
  }

  if (persistEnabled) {
    runCreate = await createCategoryDerivationRun(input.supabase, {
      activityEventId: input.activityEventId,
      input: routeInput,
      processorVersion: derivation.processorVersion,
      ruleVersion: derivation.ruleVersion ?? null,
      modelName: input.modelName ?? null,
      modelAlias: input.modelAlias ?? null,
      promptVersion: input.promptVersion ?? null,
      schemaVersion: input.schemaVersion ?? null,
      policyVersion: input.policyVersion ?? null,
      confidence: derivation.confidence ?? null,
      needsUserConfirmation:
        derivation.skipped === true || derivation.errors.length > 0,
      inputJson: {
        routeInput: jsonValue(routeInput),
      },
      outputJson: {
        derivationInitial: {
          ok: derivation.ok,
          skipped: derivation.skipped ?? false,
          candidateCount: derivation.candidates.length,
        },
      },
      metadata,
    });

    if (!runCreate.ok) {
      errors.push(...runCreate.errors);

      return makeFailureResult({
        activityEventId: input.activityEventId,
        derivation,
        runCreate,
        runFail: null,
        error: "category_derivation_run_create_failed",
        warnings,
        metadata,
      });
    }
  }

  if (resolveEnabled && derivation.candidates.length > 0) {
    resolution = await resolveCategoryCandidates(
      input.supabase,
      derivation.candidates,
      input.resolverOptions ?? {
        createPolicy: "suggested_only",
        defaultStatus: "suggested",
        sourceType: "category_derivation",
      },
    );

    warnings.push(...resolution.warnings);
    errors.push(...resolution.errors);
  }

  const candidatesToPersist: Array<CategoryCandidate | ResolvedCategoryCandidate> =
    resolution?.candidates ?? derivation.candidates;

  if (persistEnabled && runCreate?.derivationRunId) {
    persistedRows = await persistActivityCategoryDerivations(input.supabase, {
      activityEventId: input.activityEventId,
      derivationRunId: runCreate.derivationRunId,
      candidates: candidatesToPersist,
      defaultSource: "rule",
    });

    warnings.push(...persistedRows.warnings);
    errors.push(...persistedRows.errors);
  }

  const hasWarnings = warnings.length > 0;
  const hasErrors = errors.length > 0;

  if (persistEnabled && runCreate?.derivationRunId) {
    if (hasErrors) {
      runFail = await failCategoryDerivationRun(input.supabase, {
        derivationRunId: runCreate.derivationRunId,
        error: {
          message: "category_derivation_route_runner_failed",
          errors,
          warnings,
        },
        outputJson: buildOutputJson({
          derivation,
          resolution,
          persistenceRows: persistedRows,
          metadata,
        }),
      });
    } else {
      runFinish = await finishCategoryDerivationRun(input.supabase, {
        derivationRunId: runCreate.derivationRunId,
        status: hasWarnings ? "completed_with_warnings" : "completed",
        confidence: derivation.confidence ?? null,
        needsUserConfirmation:
          countUnresolved(resolution?.candidates ?? []) > 0 ||
          derivation.skipped === true,
        outputJson: buildOutputJson({
          derivation,
          resolution,
          persistenceRows: persistedRows,
          metadata,
        }),
      });

      warnings.push(...runFinish.warnings);
      errors.push(...runFinish.errors);
    }
  }

  const resolvedCandidates = resolution?.candidates ?? [];

  return {
    ok: errors.length === 0,
    activityEventId: input.activityEventId,
    persisted: persistEnabled,
    resolved: Boolean(resolution),
    derivationRunId: runCreate?.derivationRunId ?? null,
    derivation,
    resolution,
    persistence: {
      runCreate,
      rows: persistedRows,
      runFinish,
      runFail,
    },
    candidates: derivation.candidates,
    resolvedCandidates,
    warnings,
    errors,
    metadata,
  };
}
