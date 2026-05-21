import type { CategoryDerivationRunRow } from "./persistence";

export const DEFAULT_CATEGORY_DERIVATION_PROCESSOR_VERSION =
  "category_derivation_v1";

export const DEFAULT_CATEGORY_DERIVATION_RULE_VERSION = "rules_v1";

export const DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_SCHEMA_VERSION =
  "category_derivation_complete_route_v1";

export const DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_POLICY_VERSION =
  "c8-e-f4";

export const DEFAULT_COMPLETED_CATEGORY_DERIVATION_RUN_STATUSES = [
  "completed",
  "completed_with_warnings",
] as const;

export type CompletedCategoryDerivationRunStatus =
  (typeof DEFAULT_COMPLETED_CATEGORY_DERIVATION_RUN_STATUSES)[number];

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

interface SupabaseSelectQueryBuilder<T> {
  eq(
    column: string,
    value: string | number | boolean | null,
  ): SupabaseSelectQueryBuilder<T>;
  in(
    column: string,
    values: Array<string | number | boolean | null>,
  ): SupabaseSelectQueryBuilder<T>;
  order(
    column: string,
    options?: {
      ascending?: boolean;
      nullsFirst?: boolean;
      foreignTable?: string;
    },
  ): SupabaseSelectQueryBuilder<T>;
  limit(count: number): SupabaseSelectQueryBuilder<T>;
  maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseTableSelectClient<T> {
  select(columns?: string): SupabaseSelectQueryBuilder<T>;
}

export interface CategoryDerivationRunLookupClient {
  from<T = Record<string, unknown>>(table: string): SupabaseTableSelectClient<T>;
}

export interface FindExistingCompletedCategoryDerivationRunInput {
  activityEventId: string;
  processorVersion?: string;
  ruleVersion?: string;
  schemaVersion?: string;
  policyVersion?: string;
  statuses?: string[];
}

export interface FindExistingCompletedCategoryDerivationRunQuery {
  activityEventId: string;
  processorVersion: string;
  ruleVersion: string;
  schemaVersion: string;
  policyVersion: string;
  statuses: string[];
}

export type FindExistingCompletedCategoryDerivationRunReason =
  | "existing_completed_run_found"
  | "no_existing_completed_run"
  | "invalid_lookup_input"
  | "lookup_error";

export interface FindExistingCompletedCategoryDerivationRunResult {
  ok: boolean;
  found: boolean;
  reason: FindExistingCompletedCategoryDerivationRunReason;
  derivationRunId: string | null;
  row: CategoryDerivationRunRow | null;
  query: FindExistingCompletedCategoryDerivationRunQuery | null;
  errors: string[];
  warnings: string[];
}

function errorMessage(error: SupabaseErrorLike | string | Error | null): string {
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

function normalizeRequiredText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatuses(statuses: string[] | undefined): string[] {
  if (!statuses || statuses.length === 0) {
    return [...DEFAULT_COMPLETED_CATEGORY_DERIVATION_RUN_STATUSES];
  }

  const normalized = statuses
    .map((status) => normalizeRequiredText(status))
    .filter((status): status is string => status !== null);

  if (normalized.length === 0) {
    return [...DEFAULT_COMPLETED_CATEGORY_DERIVATION_RUN_STATUSES];
  }

  return Array.from(new Set(normalized));
}

export function buildCompletedCategoryDerivationRunLookupQuery(
  input: FindExistingCompletedCategoryDerivationRunInput,
): FindExistingCompletedCategoryDerivationRunQuery | null {
  const activityEventId = normalizeRequiredText(input.activityEventId);

  if (!activityEventId) {
    return null;
  }

  return {
    activityEventId,
    processorVersion:
      normalizeRequiredText(input.processorVersion) ??
      DEFAULT_CATEGORY_DERIVATION_PROCESSOR_VERSION,
    ruleVersion:
      normalizeRequiredText(input.ruleVersion) ??
      DEFAULT_CATEGORY_DERIVATION_RULE_VERSION,
    schemaVersion:
      normalizeRequiredText(input.schemaVersion) ??
      DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_SCHEMA_VERSION,
    policyVersion:
      normalizeRequiredText(input.policyVersion) ??
      DEFAULT_CATEGORY_DERIVATION_COMPLETE_ROUTE_POLICY_VERSION,
    statuses: normalizeStatuses(input.statuses),
  };
}

export async function findExistingCompletedCategoryDerivationRunForActivityEvent(
  supabase: CategoryDerivationRunLookupClient,
  input: FindExistingCompletedCategoryDerivationRunInput,
): Promise<FindExistingCompletedCategoryDerivationRunResult> {
  const query = buildCompletedCategoryDerivationRunLookupQuery(input);

  if (!query) {
    return {
      ok: false,
      found: false,
      reason: "invalid_lookup_input",
      derivationRunId: null,
      row: null,
      query: null,
      errors: ["activityEventId is required for Category Derivation run lookup."],
      warnings: [],
    };
  }

  const { data, error } = await supabase
    .from<CategoryDerivationRunRow>("category_derivation_runs")
    .select("*")
    .eq("activity_event_id", query.activityEventId)
    .eq("processor_version", query.processorVersion)
    .eq("rule_version", query.ruleVersion)
    .eq("schema_version", query.schemaVersion)
    .eq("policy_version", query.policyVersion)
    .in("status", query.statuses)
    .order("finished_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      found: false,
      reason: "lookup_error",
      derivationRunId: null,
      row: null,
      query,
      errors: [errorMessage(error)],
      warnings: [],
    };
  }

  if (!data) {
    return {
      ok: true,
      found: false,
      reason: "no_existing_completed_run",
      derivationRunId: null,
      row: null,
      query,
      errors: [],
      warnings: [],
    };
  }

  return {
    ok: true,
    found: true,
    reason: "existing_completed_run_found",
    derivationRunId: data.id,
    row: data,
    query,
    errors: [],
    warnings: [],
  };
}

export function summarizeExistingCompletedCategoryDerivationRunLookup(
  result: FindExistingCompletedCategoryDerivationRunResult,
) {
  return {
    ok: result.ok,
    found: result.found,
    reason: result.reason,
    derivationRunId: result.derivationRunId,
    query: result.query,
    errors: result.errors,
    warnings: result.warnings,
  };
}
