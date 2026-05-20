# P4.10.0-C8-P3-B6-D-C-retry — Exact Resolver Anchors After Recovery

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation resolver / exact anchors before retry patch


## 1. Git status after restore

```text
D  docs/value-objects/category-derivation-resolver-c8-p3-b6-d-c-transpile-result.json
D  docs/value-objects/category-derivation-resolver-personal-activity-context-c8-p3-b6-d-c.md
 M lib/activity/categoryDerivation/resolver.ts
D  scripts/check-c8-p3-b6-d-c-resolver-context.cjs
?? docs/value-objects/category-derivation-resolver-exact-anchors-c8-p3-b6-d-c-retry.md
?? docs/value-objects/category-derivation-resolver-failed-patch-recovery-c8-p3-b6-d-c.md
```

## 2. Resolver line count

```text
.\lib\activity\categoryDerivation\resolver.ts => 349 lines
```

## 3. Imports

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:1 | pattern: import type -----
    1: import type {
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
```

## 4. SupabaseSelectBuilder eq type

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:27 | pattern: eq(column -----
      }
      
      interface SupabaseMaybeSingleResult<T> {
        data: T | null;
        error: { message?: string } | null;
      }
      
      interface SupabaseSelectBuilder<T> {
   27:   eq(column: string, value: string): SupabaseSelectBuilder<T>;
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
      
```

## 5. ContextualCategoryRow interface

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:46 | pattern: interface ContextualCategoryRow -----
      
      export interface CategoryResolverSupabaseClient {
        from<T = Record<string, unknown>>(table: string): SupabaseTableClient<T>;
      }
      
   46: interface ContextualCategoryRow {
        id: string;
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
```

## 6. findExistingCategory function

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:87 | pattern: async function findExistingCategory -----
      
      function errorMessage(error: { message?: string } | null): string | null {
        return error?.message ?? null;
      }
      
   87: async function findExistingCategory(
        supabase: CategoryResolverSupabaseClient,
        slug: string,
        semanticLayer?: string,
      ): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
        let query = supabase
          .from<ContextualCategoryRow>("contextual_categories")
          .select("*")
          .eq("slug", slug);
      
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
      
```

## 7. createContextualCategory function

```text
NO MATCH: async function createContextualCategory
```

## 8. const payload block

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:163 | pattern: const payload -----
        const semanticLayer = candidate.semanticLayer
          ? String(candidate.semanticLayer)
          : null;
        const categoryType =
          candidate.categoryType ?? options.defaultCategoryType ?? "derived";
        const status = categoryStatusForCandidate(candidate, options);
        const title = normalizeTitle(candidate);
      
  163:   const payload: Record<string, unknown> = {
          slug: normalizedSlug,
          semantic_layer: semanticLayer,
          category_type: categoryType,
          status,
          source_type: options.sourceType ?? "rule",
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
```

## 9. resolveCategoryCandidates loop

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:214 | pattern: for (const candidate of candidates) -----
      
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
      
  214:   for (const candidate of candidates) {
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
```

## 10. createContextualCategory call

```text
NO MATCH: const created = await createContextualCategory
```

## 11. Retry rule

- Patch only after exact anchors are confirmed.
- Do not continue after a throw.
- Do not commit if smoke check reports diagnostics or failed checks.
