import type {
  CategoryCandidate,
  CategoryResolutionResult,
  JsonRecord,
  ResolvedCategoryCandidate,
} from "./types";

export type CategoryResolverCreatePolicy =
  | "never"
  | "suggested_only"
  | "active_for_confirmed_required";

export interface CategoryResolverOptions {
  createPolicy?: CategoryResolverCreatePolicy;
  defaultStatus?: "active" | "suggested" | "needs_review";
  defaultCategoryType?: string;
  sourceType?: string;
  dryRun?: boolean;
}

interface SupabaseMaybeSingleResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseSelectBuilder<T> {
  eq(column: string, value: string | number | boolean | null): SupabaseSelectBuilder<T>;
  limit(count: number): SupabaseSelectBuilder<T>;
  maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseInsertBuilder<T> {
  select(columns?: string): SupabaseInsertBuilder<T>;
  maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseTableClient<T> {
  select(columns?: string): SupabaseSelectBuilder<T>;
  insert(payload: Record<string, unknown>): SupabaseInsertBuilder<T>;
}

export interface CategoryResolverSupabaseClient {
  from<T = Record<string, unknown>>(table: string): SupabaseTableClient<T>;
}

interface ContextRow {
  id: string;
  code: string;
  name?: string | null;
  status?: string | null;
  is_active?: boolean | null;
}

interface ContextualCategoryRow {
  id: string;
  context_id?: string | null;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  semantic_layer?: string | null;
  category_type?: string | null;
  status?: string | null;
  source_type?: string | null;
  aliases?: Array<JsonRecord | string> | null;
  metadata_json?: JsonRecord | null;
}

export function normalizeCategoryCandidateSlug(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/'/g, "")
    .replace(/\u2019/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeTitle(candidate: CategoryCandidate): string {
  if (candidate.title && candidate.title.trim().length > 0) {
    return candidate.title.trim();
  }

  return candidate.slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: { message?: string } | null): string | null {
  return error?.message ?? null;
}

const DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = "personal_activity";

const CONTEXTUAL_CATEGORY_ALLOWED_SOURCE_TYPES = new Set([
  "system_seed",
  "manual",
  "ai_suggested",
  "imported",
  "migrated",
  "owner_confirmed",
  "platform_verified",
]);

function normalizeContextualCategorySourceType(sourceType: string | undefined): string {
  const normalized = sourceType?.trim();

  if (normalized && CONTEXTUAL_CATEGORY_ALLOWED_SOURCE_TYPES.has(normalized)) {
    return normalized;
  }

  return "ai_suggested";
}

async function findDefaultCategoryDerivationContextId(
  supabase: CategoryResolverSupabaseClient,
): Promise<{ contextId: string | null; error: string | null }> {
  const result = await supabase
    .from<ContextRow>("contexts")
    .select("id, code, status, is_active")
    .eq("code", DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return {
    contextId: result.data?.id ?? null,
    error: errorMessage(result.error),
  };
}

async function findExistingCategory(
  supabase: CategoryResolverSupabaseClient,
  slug: string,
  semanticLayer?: string,
  contextId?: string | null,
): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
  let query = supabase
    .from<ContextualCategoryRow>("contextual_categories")
    .select("*")
    .eq("slug", slug);

  if (contextId && contextId.trim().length > 0) {
    query = query.eq("context_id", contextId);
  }

  if (semanticLayer && semanticLayer.trim().length > 0) {
    query = query.eq("semantic_layer", semanticLayer);
  }

  const result = await query.limit(1).maybeSingle();

  return {
    row: result.data ?? null,
    error: errorMessage(result.error),
  };
}

function shouldCreateCategory(
  candidate: CategoryCandidate,
  createPolicy: CategoryResolverCreatePolicy,
): boolean {
  if (createPolicy === "never") {
    return false;
  }

  if (createPolicy === "suggested_only") {
    return true;
  }

  return Boolean(candidate.isRequired && candidate.isConfirmed);
}

function categoryStatusForCandidate(
  candidate: CategoryCandidate,
  options: Required<Pick<CategoryResolverOptions, "createPolicy">> &
    CategoryResolverOptions,
): "active" | "suggested" | "needs_review" {
  if (candidate.needsUserReview) {
    return "needs_review";
  }

  if (options.defaultStatus) {
    return options.defaultStatus;
  }

  if (
    options.createPolicy === "active_for_confirmed_required" &&
    candidate.isRequired &&
    candidate.isConfirmed
  ) {
    return "active";
  }

  return "suggested";
}

async function createCategory(
  supabase: CategoryResolverSupabaseClient,
  candidate: CategoryCandidate,
  normalizedSlug: string,
  contextId: string,
  options: Required<Pick<CategoryResolverOptions, "createPolicy">> &
    CategoryResolverOptions,
): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
  const semanticLayer = candidate.semanticLayer
    ? String(candidate.semanticLayer)
    : null;
  const categoryType =
    candidate.categoryType ?? options.defaultCategoryType ?? "derived";
  const status = categoryStatusForCandidate(candidate, options);
  const title = normalizeTitle(candidate);

  const payload: Record<string, unknown> = {
    context_id: contextId,
    slug: normalizedSlug,
    name: title,
    semantic_layer: semanticLayer,
    category_type: categoryType,
    status,
    source_type: normalizeContextualCategorySourceType(options.sourceType),
    aliases: [
      {
        lang: "und",
        value: title,
        source: "category_derivation_resolver",
      },
    ],
    metadata_json: {
      ...(candidate.metadata ?? {}),
      resolver: "categoryDerivationResolver",
      title,
      originalSlug: candidate.slug,
      confidence: candidate.confidence ?? null,
      isRequired: candidate.isRequired ?? false,
      isConfirmed: candidate.isConfirmed ?? false,
      needsUserReview: candidate.needsUserReview ?? false,
    },
  };

  const result = await supabase
    .from<ContextualCategoryRow>("contextual_categories")
    .insert(payload)
    .select("*")
    .maybeSingle();

  return {
    row: result.data ?? null,
    error: errorMessage(result.error),
  };
}

export async function resolveCategoryCandidates(
  supabase: CategoryResolverSupabaseClient,
  candidates: CategoryCandidate[],
  options: CategoryResolverOptions = {},
): Promise<CategoryResolutionResult> {
  const createPolicy = options.createPolicy ?? "suggested_only";
  const resolved: ResolvedCategoryCandidate[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  let createdCount = 0;
  let reusedCount = 0;
  let unresolvedCount = 0;

  const defaultContextResult =
    await findDefaultCategoryDerivationContextId(supabase);

  const defaultContextId = defaultContextResult.contextId;

  if (defaultContextResult.error) {
    warnings.push(
      `Default category derivation context lookup failed: ${defaultContextResult.error}`,
    );
  }

  if (!defaultContextId && createPolicy !== "never") {
    warnings.push(
      `Default category derivation context not found: ${DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE}`,
    );
  }

  for (const candidate of candidates) {
    const normalizedSlug = normalizeCategoryCandidateSlug(candidate.slug);

    if (normalizedSlug.length === 0) {
      unresolvedCount += 1;
      warnings.push(`Candidate slug could not be normalized: ${candidate.slug}`);
      resolved.push({
        ...candidate,
        categoryId: null,
        resolutionStatus: "unresolved",
        metadata: {
          ...(candidate.metadata ?? {}),
          normalizedSlug,
          resolverWarning: "empty_normalized_slug",
        },
      });
      continue;
    }

    const semanticLayer = candidate.semanticLayer
      ? String(candidate.semanticLayer)
      : undefined;
    const existing = await findExistingCategory(
      supabase,
      normalizedSlug,
      semanticLayer,
      defaultContextId,
    );

    if (existing.error) {
      errors.push(`Lookup failed for ${normalizedSlug}: ${existing.error}`);
    }

    if (existing.row?.id) {
      reusedCount += 1;
      resolved.push({
        ...candidate,
        slug: normalizedSlug,
        title:
          candidate.title ??
          existing.row.title ??
          existing.row.name ??
          normalizeTitle(candidate),
        categoryId: existing.row.id,
        resolutionStatus: "resolved_existing",
        metadata: {
          ...(candidate.metadata ?? {}),
          normalizedSlug,
          existingStatus: existing.row.status ?? null,
        },
      });
      continue;
    }

    if (!shouldCreateCategory(candidate, createPolicy) || options.dryRun) {
      unresolvedCount += 1;
      resolved.push({
        ...candidate,
        slug: normalizedSlug,
        categoryId: null,
        resolutionStatus: "unresolved",
        metadata: {
          ...(candidate.metadata ?? {}),
          normalizedSlug,
          dryRun: options.dryRun ?? false,
          createPolicy,
        },
      });
      continue;
    }

    if (!defaultContextId) {
      unresolvedCount += 1;
      warnings.push(
        `Cannot create contextual category without default context: ${normalizedSlug}`,
      );
      resolved.push({
        ...candidate,
        categoryId: null,
        resolutionStatus: "unresolved",
        metadata: {
          ...(candidate.metadata ?? {}),
          normalizedSlug,
          createPolicy,
          missingContextCode: DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE,
        },
      });
      continue;
    }

    const created = await createCategory(supabase, candidate, normalizedSlug, defaultContextId, {
      ...options,
      createPolicy,
    });

    if (created.error || !created.row?.id) {
      unresolvedCount += 1;
      errors.push(
        `Create failed for ${normalizedSlug}: ${
          created.error ?? "no row returned"
        }`,
      );
      resolved.push({
        ...candidate,
        slug: normalizedSlug,
        categoryId: null,
        resolutionStatus: "unresolved",
        metadata: {
          ...(candidate.metadata ?? {}),
          normalizedSlug,
          createError: created.error ?? "no row returned",
        },
      });
      continue;
    }

    createdCount += 1;
    resolved.push({
      ...candidate,
      slug: normalizedSlug,
      title:
        candidate.title ??
        created.row.title ??
        created.row.name ??
        normalizeTitle(candidate),
      categoryId: created.row.id,
      resolutionStatus:
        created.row.status === "active" ? "created_active" : "created_suggested",
      metadata: {
        ...(candidate.metadata ?? {}),
        normalizedSlug,
        createdStatus: created.row.status ?? null,
      },
    });
  }

  return {
    ok: errors.length === 0,
    candidates: resolved,
    createdCount,
    reusedCount,
    unresolvedCount,
    warnings,
    errors,
    metadata: {
      resolver: "categoryDerivationResolver",
      createPolicy,
      dryRun: options.dryRun ?? false,
      inputCandidateCount: candidates.length,
    },
  };
}

export const categoryDerivationResolver = {
  resolveCategoryCandidates,
};
