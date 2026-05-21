import type {
  CategoryCandidate,
  CategoryDerivationInput,
  CategoryDerivationRunStatus,
  CategoryDerivationSource,
  JsonRecord,
  JsonValue,
  ResolvedCategoryCandidate,
} from "./types";

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

type SupabaseMaybeSingleResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

interface SupabaseInsertSelectBuilder<T> {
  select(columns?: string): SupabaseInsertSelectBuilder<T>;
  maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseUpdateSelectBuilder<T> {
  eq(column: string, value: string | number | boolean | null): SupabaseUpdateSelectBuilder<T>;
  select(columns?: string): SupabaseUpdateSelectBuilder<T>;
  maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseTableClient<T> {
  insert(payload: Record<string, unknown>): SupabaseInsertSelectBuilder<T>;
  update(payload: Record<string, unknown>): SupabaseUpdateSelectBuilder<T>;
}

export interface CategoryDerivationPersistenceClient {
  from<T = Record<string, unknown>>(table: string): SupabaseTableClient<T>;
}

export type ActivityCategoryDerivationStatus =
  | "candidate"
  | "resolved"
  | "confirmed"
  | "needs_review"
  | "unresolved"
  | "rejected"
  | "revoked";

export interface CategoryDerivationRunRow {
  id: string;
  activity_event_id: string;
  actor_id?: string | null;
  organization_id?: string | null;
  input_text?: string | null;
  input_language?: string | null;
  processor_version?: string | null;
  rule_version?: string | null;
  model_name?: string | null;
  model_alias?: string | null;
  prompt_version?: string | null;
  schema_version?: string | null;
  policy_version?: string | null;
  status?: string | null;
  confidence?: number | null;
  needs_user_confirmation?: boolean | null;
  input_hash?: string | null;
  token_usage_json?: JsonRecord | null;
  cost_json?: JsonRecord | null;
  input_json?: JsonRecord | null;
  output_json?: JsonRecord | null;
  error_json?: JsonRecord | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ActivityCategoryDerivationRow {
  id: string;
  activity_event_id: string;
  derivation_run_id?: string | null;
  category_id?: string | null;
  candidate_slug?: string | null;
  candidate_title?: string | null;
  semantic_layer?: string | null;
  category_type?: string | null;
  source?: string | null;
  confidence?: number | null;
  is_required?: boolean | null;
  is_confirmed?: boolean | null;
  needs_user_review?: boolean | null;
  is_rejected?: boolean | null;
  status?: string | null;
  is_revoked?: boolean | null;
  is_core_meaning?: boolean | null;
  evidence_json?: JsonRecord | null;
  metadata_json?: JsonRecord | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateCategoryDerivationRunInput {
  activityEventId: string;
  input: CategoryDerivationInput;
  processorVersion: string;
  ruleVersion?: string | null;
  modelName?: string | null;
  modelAlias?: string | null;
  promptVersion?: string | null;
  schemaVersion?: string | null;
  policyVersion?: string | null;
  confidence?: number | null;
  needsUserConfirmation?: boolean;
  tokenUsage?: JsonRecord;
  cost?: JsonRecord;
  inputJson?: JsonRecord;
  outputJson?: JsonRecord;
  metadata?: JsonRecord;
}

export interface CreateCategoryDerivationRunResult {
  ok: boolean;
  derivationRunId: string | null;
  inputHash: string;
  row: CategoryDerivationRunRow | null;
  errors: string[];
  warnings: string[];
}

export interface FinishCategoryDerivationRunInput {
  derivationRunId: string;
  status?: Extract<CategoryDerivationRunStatus, "completed" | "completed_with_warnings">;
  confidence?: number | null;
  needsUserConfirmation?: boolean;
  outputJson?: JsonRecord;
  tokenUsage?: JsonRecord;
  cost?: JsonRecord;
}

export interface FailCategoryDerivationRunInput {
  derivationRunId: string;
  error: string | Error | JsonRecord;
  outputJson?: JsonRecord;
}

export interface UpdateCategoryDerivationRunResult {
  ok: boolean;
  derivationRunId: string;
  row: CategoryDerivationRunRow | null;
  errors: string[];
  warnings: string[];
}

export interface PersistActivityCategoryDerivationsInput {
  activityEventId: string;
  derivationRunId?: string | null;
  candidates: Array<CategoryCandidate | ResolvedCategoryCandidate>;
  defaultSource?: CategoryDerivationSource;
}

export interface PersistActivityCategoryDerivationsResult {
  ok: boolean;
  activityEventId: string;
  derivationRunId: string | null;
  rows: ActivityCategoryDerivationRow[];
  rowsCreated: number;
  resolvedCount: number;
  unresolvedCount: number;
  needsReviewCount: number;
  errors: string[];
  warnings: string[];
}

function errorMessage(error: SupabaseErrorLike | string | Error | null | undefined): string {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return error.message ?? JSON.stringify(error);
}

function asJsonRecord(value: JsonRecord | null | undefined): JsonRecord {
  return value ?? {};
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function nullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stableJson(value: JsonValue | JsonRecord | undefined | null): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, JsonValue | undefined>;
    const keys = Object.keys(record).sort();

    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildCategoryDerivationInputHash(input: CategoryDerivationInput): string {
  const normalized: JsonRecord = {
    activityEventId: nullableText(input.activityEventId),
    inputText: nullableText(input.inputText)?.toLowerCase() ?? "",
    title: nullableText(input.title)?.toLowerCase() ?? null,
    description: nullableText(input.description)?.toLowerCase() ?? null,
    durationMinutes: nullableNumber(input.durationMinutes),
    inputLanguage: nullableText(input.inputLanguage)?.toLowerCase() ?? null,
    actorId: nullableText(input.actorId),
    organizationId: nullableText(input.organizationId),
    metadata: asJsonRecord(input.metadata),
  };

  return `category-derivation-v1:${fnv1a32(stableJson(normalized))}`;
}

function buildRunInputJson(params: CreateCategoryDerivationRunInput): JsonRecord {
  return {
    ...(params.inputJson ?? {}),
    input: {
      activityEventId: params.activityEventId,
      inputText: params.input.inputText,
      title: params.input.title ?? null,
      description: params.input.description ?? null,
      durationMinutes: params.input.durationMinutes ?? null,
      inputLanguage: params.input.inputLanguage ?? null,
      actorId: params.input.actorId ?? null,
      organizationId: params.input.organizationId ?? null,
      metadata: params.input.metadata ?? {},
    },
    metadata: params.metadata ?? {},
  };
}

export async function createCategoryDerivationRun(
  supabase: CategoryDerivationPersistenceClient,
  params: CreateCategoryDerivationRunInput,
): Promise<CreateCategoryDerivationRunResult> {
  const inputHash = buildCategoryDerivationInputHash({
    ...params.input,
    activityEventId: params.activityEventId,
  });

  const payload: Record<string, unknown> = {
    activity_event_id: params.activityEventId,
    actor_id: params.input.actorId ?? null,
    organization_id: params.input.organizationId ?? null,
    input_text: params.input.inputText ?? null,
    input_language: params.input.inputLanguage ?? null,
    processor_version: params.processorVersion,
    rule_version: nullableText(params.ruleVersion),
    model_name: nullableText(params.modelName),
    model_alias: nullableText(params.modelAlias),
    prompt_version: nullableText(params.promptVersion),
    schema_version: nullableText(params.schemaVersion),
    policy_version: nullableText(params.policyVersion),
    status: "started",
    confidence: nullableNumber(params.confidence),
    needs_user_confirmation: params.needsUserConfirmation ?? false,
    input_hash: inputHash,
    token_usage_json: asJsonRecord(params.tokenUsage),
    cost_json: asJsonRecord(params.cost),
    input_json: buildRunInputJson(params),
    output_json: asJsonRecord(params.outputJson),
    error_json: null,
  };

  const { data, error } = await supabase
    .from<CategoryDerivationRunRow>("category_derivation_runs")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      derivationRunId: null,
      inputHash,
      row: null,
      errors: [errorMessage(error)],
      warnings: [],
    };
  }

  return {
    ok: true,
    derivationRunId: data.id,
    inputHash,
    row: data,
    errors: [],
    warnings: [],
  };
}

export async function finishCategoryDerivationRun(
  supabase: CategoryDerivationPersistenceClient,
  params: FinishCategoryDerivationRunInput,
): Promise<UpdateCategoryDerivationRunResult> {
  const payload: Record<string, unknown> = {
    status: params.status ?? "completed",
    confidence: nullableNumber(params.confidence),
    needs_user_confirmation: params.needsUserConfirmation ?? false,
    output_json: asJsonRecord(params.outputJson),
    token_usage_json: asJsonRecord(params.tokenUsage),
    cost_json: asJsonRecord(params.cost),
    error_json: null,
    finished_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from<CategoryDerivationRunRow>("category_derivation_runs")
    .update(payload)
    .eq("id", params.derivationRunId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      derivationRunId: params.derivationRunId,
      row: null,
      errors: [errorMessage(error)],
      warnings: [],
    };
  }

  return {
    ok: true,
    derivationRunId: params.derivationRunId,
    row: data,
    errors: [],
    warnings: [],
  };
}

function normalizeFailureError(error: string | Error | JsonRecord): JsonRecord {
  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? null,
    };
  }

  return error;
}

export async function failCategoryDerivationRun(
  supabase: CategoryDerivationPersistenceClient,
  params: FailCategoryDerivationRunInput,
): Promise<UpdateCategoryDerivationRunResult> {
  const payload: Record<string, unknown> = {
    status: "failed",
    output_json: asJsonRecord(params.outputJson),
    error_json: normalizeFailureError(params.error),
    finished_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from<CategoryDerivationRunRow>("category_derivation_runs")
    .update(payload)
    .eq("id", params.derivationRunId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      derivationRunId: params.derivationRunId,
      row: null,
      errors: [errorMessage(error)],
      warnings: [],
    };
  }

  return {
    ok: true,
    derivationRunId: params.derivationRunId,
    row: data,
    errors: [],
    warnings: [],
  };
}

function isResolvedCandidate(
  candidate: CategoryCandidate | ResolvedCategoryCandidate,
): candidate is ResolvedCategoryCandidate {
  return "categoryId" in candidate;
}

function candidateStatus(
  candidate: CategoryCandidate | ResolvedCategoryCandidate,
): ActivityCategoryDerivationStatus {
  if (candidate.isConfirmed) {
    return "confirmed";
  }

  if (candidate.needsUserReview) {
    return "needs_review";
  }

  if (isResolvedCandidate(candidate)) {
    if (candidate.resolutionStatus === "unresolved" || !candidate.categoryId) {
      return "unresolved";
    }

    return "resolved";
  }

  return "candidate";
}

function candidateEvidence(candidate: CategoryCandidate | ResolvedCategoryCandidate): JsonRecord {
  const metadata = asJsonRecord(candidate.metadata);
  const evidence = metadata.evidence;

  if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
    return evidence as JsonRecord;
  }

  return {};
}

function candidateMetadata(candidate: CategoryCandidate | ResolvedCategoryCandidate): JsonRecord {
  return {
    ...(candidate.metadata ?? {}),
    persistence: {
      status: candidateStatus(candidate),
      resolutionStatus: isResolvedCandidate(candidate) ? candidate.resolutionStatus : null,
      categoryId: isResolvedCandidate(candidate) ? candidate.categoryId : null,
    },
  };
}

function candidatePayload(
  input: PersistActivityCategoryDerivationsInput,
  candidate: CategoryCandidate | ResolvedCategoryCandidate,
): Record<string, unknown> {
  const status = candidateStatus(candidate);
  const categoryId = isResolvedCandidate(candidate) ? candidate.categoryId : null;

  return {
    activity_event_id: input.activityEventId,
    derivation_run_id: input.derivationRunId ?? null,
    category_id: categoryId,
    candidate_slug: candidate.slug,
    candidate_title: candidate.title ?? null,
    semantic_layer: candidate.semanticLayer ?? null,
    category_type: candidate.categoryType ?? null,
    source: candidate.source ?? input.defaultSource ?? "rule",
    confidence: nullableNumber(candidate.confidence),
    is_required: candidate.isRequired ?? false,
    is_confirmed: candidate.isConfirmed ?? false,
    needs_user_review: candidate.needsUserReview ?? status === "needs_review",
    is_rejected: status === "rejected",
    status,
    is_revoked: status === "revoked",
    is_core_meaning: Boolean(candidate.metadata?.isCoreMeaning),
    evidence_json: candidateEvidence(candidate),
    metadata_json: candidateMetadata(candidate),
  };
}

export async function persistActivityCategoryDerivations(
  supabase: CategoryDerivationPersistenceClient,
  input: PersistActivityCategoryDerivationsInput,
): Promise<PersistActivityCategoryDerivationsResult> {
  const rows: ActivityCategoryDerivationRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let resolvedCount = 0;
  let unresolvedCount = 0;
  let needsReviewCount = 0;

  for (const candidate of input.candidates) {
    const status = candidateStatus(candidate);

    if (status === "resolved" || status === "confirmed") {
      resolvedCount += 1;
    }

    if (status === "unresolved") {
      unresolvedCount += 1;
    }

    if (status === "needs_review") {
      needsReviewCount += 1;
    }

    const { data, error } = await supabase
      .from<ActivityCategoryDerivationRow>("activity_category_derivations")
      .insert(candidatePayload(input, candidate))
      .select("*")
      .maybeSingle();

    if (error || !data) {
      errors.push(`${candidate.slug}: ${errorMessage(error)}`);
      continue;
    }

    rows.push(data);
  }

  return {
    ok: errors.length === 0,
    activityEventId: input.activityEventId,
    derivationRunId: input.derivationRunId ?? null,
    rows,
    rowsCreated: rows.length,
    resolvedCount,
    unresolvedCount,
    needsReviewCount,
    errors,
    warnings,
  };
}
