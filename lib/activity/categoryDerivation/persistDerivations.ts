import type {
  ActivityCategoryDerivationInsert,
  CategoryCandidate,
  CategoryDerivationInput,
  CategoryDerivationResult,
  CategoryDerivationRunInsert,
  CategoryDerivationRunStatus,
  JsonRecord,
  ResolvedCategoryCandidate,
} from "./types";

interface SupabaseMaybeSingleResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseInsertBuilder<T> {
  select(columns?: string): SupabaseInsertBuilder<T>;
  maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseTableClient<T> {
  insert(payload: Record<string, unknown>): SupabaseInsertBuilder<T>;
}

export interface CategoryDerivationPersistenceSupabaseClient {
  from<T = Record<string, unknown>>(table: string): SupabaseTableClient<T>;
}

interface CategoryDerivationRunRow {
  id: string;
  activity_event_id?: string | null;
  status?: string | null;
}

interface ActivityCategoryDerivationRow {
  id: string;
  activity_event_id?: string | null;
  derivation_run_id?: string | null;
  category_id?: string | null;
  candidate_slug?: string | null;
}

export interface PersistCategoryDerivationsParams {
  activityEventId: string;
  input: CategoryDerivationInput;
  derivationResult: CategoryDerivationResult;
  resolvedCandidates?: ResolvedCategoryCandidate[];
  actorId?: string | null;
  organizationId?: string | null;
  modelName?: string | null;
  promptVersion?: string | null;
  needsUserConfirmation?: boolean;
}

export interface PersistCategoryDerivationsResult {
  ok: boolean;
  derivationRunId: string | null;
  derivationRowsCreated: number;
  candidateCount: number;
  resolvedCandidateCount: number;
  unresolvedCandidateCount: number;
  warnings: string[];
  errors: string[];
  runInsert?: CategoryDerivationRunInsert;
  derivationInserts?: ActivityCategoryDerivationInsert[];
}

function errorMessage(error: { message?: string } | null): string | null {
  return error?.message ?? null;
}

function toJsonRecord(value: Record<string, unknown>): JsonRecord {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function candidateSource(candidate: CategoryCandidate): CategoryCandidate["source"] {
  return candidate.source ?? "rule";
}

function normalizeRunStatus(
  derivationResult: CategoryDerivationResult,
): CategoryDerivationRunStatus {
  if (derivationResult.errors.length > 0 || derivationResult.ok === false) {
    return "failed";
  }

  if (derivationResult.warnings.length > 0) {
    return "completed_with_warnings";
  }

  return "completed";
}

function resolvedOrUnresolvedCandidates(
  derivationResult: CategoryDerivationResult,
  resolvedCandidates?: ResolvedCategoryCandidate[],
): ResolvedCategoryCandidate[] {
  if (resolvedCandidates && resolvedCandidates.length > 0) {
    return resolvedCandidates;
  }

  return derivationResult.candidates.map((candidate) => ({
    ...candidate,
    categoryId: null,
    resolutionStatus: "unresolved",
  }));
}

function countResolved(candidates: ResolvedCategoryCandidate[]): number {
  return candidates.filter((candidate) => Boolean(candidate.categoryId)).length;
}

function countUnresolved(candidates: ResolvedCategoryCandidate[]): number {
  return candidates.filter((candidate) => !candidate.categoryId).length;
}

function buildRunInsert(
  params: PersistCategoryDerivationsParams,
  candidates: ResolvedCategoryCandidate[],
): CategoryDerivationRunInsert {
  const status = normalizeRunStatus(params.derivationResult);

  return {
    activity_event_id: params.activityEventId,
    actor_id: params.actorId ?? params.input.actorId ?? null,
    organization_id:
      params.organizationId ?? params.input.organizationId ?? null,
    input_text: params.input.inputText ?? null,
    input_language: params.input.inputLanguage ?? null,
    processor_version: params.derivationResult.processorVersion,
    rule_version: params.derivationResult.ruleVersion ?? null,
    model_name: params.modelName ?? null,
    prompt_version: params.promptVersion ?? null,
    status,
    confidence: params.derivationResult.confidence ?? null,
    needs_user_confirmation: params.needsUserConfirmation ?? false,
    input_json: toJsonRecord({
      activityEventId: params.activityEventId,
      inputText: params.input.inputText,
      title: params.input.title ?? null,
      description: params.input.description ?? null,
      durationMinutes: params.input.durationMinutes ?? null,
      inputLanguage: params.input.inputLanguage ?? null,
      actorId: params.actorId ?? params.input.actorId ?? null,
      organizationId:
        params.organizationId ?? params.input.organizationId ?? null,
      metadata: params.input.metadata ?? {},
    }),
    output_json: toJsonRecord({
      ok: params.derivationResult.ok,
      skipped: params.derivationResult.skipped ?? false,
      skipReason: params.derivationResult.skipReason ?? null,
      processorVersion: params.derivationResult.processorVersion,
      ruleVersion: params.derivationResult.ruleVersion ?? null,
      confidence: params.derivationResult.confidence ?? null,
      warnings: params.derivationResult.warnings,
      errors: params.derivationResult.errors,
      candidateCount: params.derivationResult.candidates.length,
      resolvedCandidateCount: countResolved(candidates),
      unresolvedCandidateCount: countUnresolved(candidates),
      candidates,
      metadata: params.derivationResult.metadata ?? {},
    }),
    error_json:
      status === "failed"
        ? toJsonRecord({
            errors: params.derivationResult.errors,
            warnings: params.derivationResult.warnings,
          })
        : null,
  };
}

function buildDerivationInsert(
  activityEventId: string,
  derivationRunId: string,
  candidate: ResolvedCategoryCandidate,
): ActivityCategoryDerivationInsert {
  return {
    activity_event_id: activityEventId,
    derivation_run_id: derivationRunId,
    category_id: candidate.categoryId ?? null,
    candidate_slug: candidate.slug,
    candidate_title: candidate.title ?? null,
    semantic_layer: candidate.semanticLayer
      ? String(candidate.semanticLayer)
      : null,
    category_type: candidate.categoryType ?? null,
    source: candidateSource(candidate),
    confidence: candidate.confidence ?? null,
    is_required: candidate.isRequired ?? false,
    is_confirmed: candidate.isConfirmed ?? false,
    needs_user_review: candidate.needsUserReview ?? false,
    is_rejected: false,
    metadata_json: toJsonRecord({
      ...(candidate.metadata ?? {}),
      resolutionStatus: candidate.resolutionStatus,
      categoryId: candidate.categoryId ?? null,
    }),
  };
}

async function insertDerivationRun(
  supabase: CategoryDerivationPersistenceSupabaseClient,
  payload: CategoryDerivationRunInsert,
): Promise<{
  row: CategoryDerivationRunRow | null;
  error: string | null;
}> {
  const result = await supabase
    .from<CategoryDerivationRunRow>("category_derivation_runs")
    .insert(payload as unknown as Record<string, unknown>)
    .select("*")
    .maybeSingle();

  return {
    row: result.data ?? null,
    error: errorMessage(result.error),
  };
}

async function insertActivityCategoryDerivation(
  supabase: CategoryDerivationPersistenceSupabaseClient,
  payload: ActivityCategoryDerivationInsert,
): Promise<{
  row: ActivityCategoryDerivationRow | null;
  error: string | null;
}> {
  const result = await supabase
    .from<ActivityCategoryDerivationRow>("activity_category_derivations")
    .insert(payload as unknown as Record<string, unknown>)
    .select("*")
    .maybeSingle();

  return {
    row: result.data ?? null,
    error: errorMessage(result.error),
  };
}

export async function persistCategoryDerivations(
  supabase: CategoryDerivationPersistenceSupabaseClient,
  params: PersistCategoryDerivationsParams,
): Promise<PersistCategoryDerivationsResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!params.activityEventId || params.activityEventId.trim().length === 0) {
    return {
      ok: false,
      derivationRunId: null,
      derivationRowsCreated: 0,
      candidateCount: params.derivationResult.candidates.length,
      resolvedCandidateCount: 0,
      unresolvedCandidateCount: params.derivationResult.candidates.length,
      warnings,
      errors: ["activityEventId is required."],
    };
  }

  const candidates = resolvedOrUnresolvedCandidates(
    params.derivationResult,
    params.resolvedCandidates,
  );
  const runInsert = buildRunInsert(params, candidates);
  const runResult = await insertDerivationRun(supabase, runInsert);

  if (runResult.error || !runResult.row?.id) {
    return {
      ok: false,
      derivationRunId: null,
      derivationRowsCreated: 0,
      candidateCount: candidates.length,
      resolvedCandidateCount: countResolved(candidates),
      unresolvedCandidateCount: countUnresolved(candidates),
      warnings,
      errors: [
        `Failed to insert category_derivation_runs: ${
          runResult.error ?? "no row returned"
        }`,
      ],
      runInsert,
    };
  }

  const derivationRunId = runResult.row.id;
  const derivationInserts = candidates.map((candidate) =>
    buildDerivationInsert(params.activityEventId, derivationRunId, candidate),
  );

  let derivationRowsCreated = 0;

  for (const insertPayload of derivationInserts) {
    const insertResult = await insertActivityCategoryDerivation(
      supabase,
      insertPayload,
    );

    if (insertResult.error || !insertResult.row?.id) {
      errors.push(
        `Failed to insert activity_category_derivations for ${insertPayload.candidate_slug}: ${
          insertResult.error ?? "no row returned"
        }`,
      );
      continue;
    }

    derivationRowsCreated += 1;
  }

  return {
    ok: errors.length === 0,
    derivationRunId,
    derivationRowsCreated,
    candidateCount: candidates.length,
    resolvedCandidateCount: countResolved(candidates),
    unresolvedCandidateCount: countUnresolved(candidates),
    warnings,
    errors,
    runInsert,
    derivationInserts,
  };
}

export const categoryDerivationPersistence = {
  persistCategoryDerivations,
};