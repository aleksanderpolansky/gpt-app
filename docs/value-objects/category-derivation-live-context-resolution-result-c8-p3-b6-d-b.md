# P4.10.0-C8-P3-B6-D-B — Live Context Resolution Result and Resolver Patch Plan

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / resolver contextual_categories context_id fix


## 1. Git status

```text
?? docs/value-objects/category-derivation-live-context-resolution-result-c8-p3-b6-d-b.md
```

## 2. Recent commits

```text
d0d4c96 Add live context resolution SQL check
b0c4003 Map exact contextual categories schema and resolver create path
0663508 Document category derivation route browser suite partial result
f74fa90 Add category derivation route browser regression suite
2da385a Fix category derivation route activity event id passthrough
67ea151 Fix category derivation route additional category links passthrough
f71994b Pass category derivation resolved candidates to bridge
8b1adbf Fix category derivation lifecycle additional category links passthrough
5fcd2c0 Add category derivation lifecycle additional category links passthrough
3f533da Map category derivation lifecycle passthrough anchors
7441d07 Map category derivation lifecycle passthrough anchors
3635af8 Map category derivation route patch anchors
```

## 3. Live SQL result summary

- contexts table exists and contains active system_seed contexts.
- contextual_categories.context_id is NOT NULL.
- contextual_categories uniqueness is context_id + lower(slug).
- Candidate categories walking/work/commute-to-work/walking-to-work/duration-minutes do not yet exist.
- likely default context for current debug route: personal_activity.

Known live personal_activity context:
```text
id: 7649bd63-e05f-4087-a77a-97fc5ee885ca
code: personal_activity
name: Personal activity
status: approved
is_active: true
source_type: system_seed
```

## 4. Why Case 3 failed

B6 browser suite Case 3 used Category Derivation dryRun=false.

Resolver attempted to create contextual_categories rows but inserted context_id = null.

Database rejected the insert:

```text
null value in column "context_id" of relation "contextual_categories" violates not-null constraint
```

## 5. Minimal resolver fix decision

For the current debug route / personal activity ingestion path, resolver should create missing contextual_categories under the personal_activity context.

Minimal target behavior:

- Find context where code = personal_activity, status approved/published/suggested, is_active = true.
- Use that context_id when inserting contextual_categories.
- Preserve existing lookup by slug, but make lookup context-aware: context_id + lower(slug).
- Keep createPolicy behavior unchanged.
- Do not modify route additionalCategoryLinks guards.
- Do not insert additional bridge links if resolver still fails or categoryId remains null.

## 6. Resolver anchors for next patch


## 6.1 Resolver contextual_categories usage

```text
MATCH COUNT: 2

----- .\lib\activity\categoryDerivation\resolver.ts:93 | pattern: contextual_categories -----
      }
      
      function errorMessage(error: { message?: string } | null): string | null {
        return error?.message ?? null;
      }
      
      async function findExistingCategory(
        supabase: CategoryResolverSupabaseClient,
        slug: string,
        semanticLayer?: string,
      ): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
        let query = supabase
   93:     .from<ContextualCategoryRow>("contextual_categories")
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

----- .\lib\activity\categoryDerivation\resolver.ts:189 | pattern: contextual_categories -----
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
  189:     .from<ContextualCategoryRow>("contextual_categories")
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
```

## 6.2 Resolver maybeSingle usage

```text
MATCH COUNT: 5

----- .\lib\activity\categoryDerivation\resolver.ts:21 | pattern: maybeSingle -----
        | "active_for_confirmed_required";
      
      export interface CategoryResolverOptions {
        createPolicy?: CategoryResolverCreatePolicy;
        defaultStatus?: "active" | "suggested" | "needs_review";
        defaultCategoryType?: string;
        sourceType?: string;
        dryRun?: boolean;
      }
      
   21: interface SupabaseMaybeSingleResult<T> {
        data: T | null;
        error: { message?: string } | null;
      }
      
      interface SupabaseSelectBuilder<T> {
        eq(column: string, value: string): SupabaseSelectBuilder<T>;
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
      
      interface ContextualCategoryRow {

----- .\lib\activity\categoryDerivation\resolver.ts:29 | pattern: maybeSingle -----
      }
      
      interface SupabaseMaybeSingleResult<T> {
        data: T | null;
        error: { message?: string } | null;
      }
      
      interface SupabaseSelectBuilder<T> {
        eq(column: string, value: string): SupabaseSelectBuilder<T>;
        limit(count: number): SupabaseSelectBuilder<T>;
   29:   maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
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
      
      interface ContextualCategoryRow {
        id: string;
        slug?: string | null;
        title?: string | null;
        name?: string | null;
        semantic_layer?: string | null;
        category_type?: string | null;
        status?: string | null;
        source_type?: string | null;

----- .\lib\activity\categoryDerivation\resolver.ts:34 | pattern: maybeSingle -----
      }
      
      interface SupabaseSelectBuilder<T> {
        eq(column: string, value: string): SupabaseSelectBuilder<T>;
        limit(count: number): SupabaseSelectBuilder<T>;
        maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
      }
      
      interface SupabaseInsertBuilder<T> {
        select(columns?: string): SupabaseInsertBuilder<T>;
   34:   maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
      }
      
      interface SupabaseTableClient<T> {
        select(columns?: string): SupabaseSelectBuilder<T>;
        insert(payload: Record<string, unknown>): SupabaseInsertBuilder<T>;
      }
      
      export interface CategoryResolverSupabaseClient {
        from<T = Record<string, unknown>>(table: string): SupabaseTableClient<T>;
      }
      
      interface ContextualCategoryRow {
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

----- .\lib\activity\categoryDerivation\resolver.ts:101 | pattern: maybeSingle -----
      ): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
        let query = supabase
          .from<ContextualCategoryRow>("contextual_categories")
          .select("*")
          .eq("slug", slug);
      
        if (semanticLayer && semanticLayer.trim().length > 0) {
          query = query.eq("semantic_layer", semanticLayer);
        }
      
  101:   const result = await query.limit(1).maybeSingle();
      
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

----- .\lib\activity\categoryDerivation\resolver.ts:192 | pattern: maybeSingle -----
            isRequired: candidate.isRequired ?? false,
            isConfirmed: candidate.isConfirmed ?? false,
            needsUserReview: candidate.needsUserReview ?? false,
          },
        };
      
        const result = await supabase
          .from<ContextualCategoryRow>("contextual_categories")
          .insert(payload)
          .select("*")
  192:     .maybeSingle();
      
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
      
        for (const candidate of candidates) {
          const normalizedSlug = normalizeCategoryCandidateSlug(candidate.slug);
      
          if (normalizedSlug.length === 0) {
```

## 6.3 Resolver insert usage

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:190 | pattern: .insert -----
            originalSlug: candidate.slug,
            confidence: candidate.confidence ?? null,
            isRequired: candidate.isRequired ?? false,
            isConfirmed: candidate.isConfirmed ?? false,
            needsUserReview: candidate.needsUserReview ?? false,
          },
        };
      
        const result = await supabase
          .from<ContextualCategoryRow>("contextual_categories")
  190:     .insert(payload)
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
```

## 6.4 Resolver created_suggested usage

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:321 | pattern: created_suggested -----
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
  321:         created.row.status === "active" ? "created_active" : "created_suggested",
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
      
```

## 6.5 Resolver normalize slug usage

```text
MATCH COUNT: 17

----- .\lib\activity\categoryDerivation\resolver.ts:151 | pattern: normalizedSlug -----
        ) {
          return "active";
        }
      
        return "suggested";
      }
      
      async function createCategory(
        supabase: CategoryResolverSupabaseClient,
        candidate: CategoryCandidate,
  151:   normalizedSlug: string,
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

----- .\lib\activity\categoryDerivation\resolver.ts:164 | pattern: normalizedSlug -----
      ): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
        const semanticLayer = candidate.semanticLayer
          ? String(candidate.semanticLayer)
          : null;
        const categoryType =
          candidate.categoryType ?? options.defaultCategoryType ?? "derived";
        const status = categoryStatusForCandidate(candidate, options);
        const title = normalizeTitle(candidate);
      
        const payload: Record<string, unknown> = {
  164:     slug: normalizedSlug,
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

----- .\lib\activity\categoryDerivation\resolver.ts:215 | pattern: normalizedSlug -----
        const createPolicy = options.createPolicy ?? "suggested_only";
        const resolved: ResolvedCategoryCandidate[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];
      
        let createdCount = 0;
        let reusedCount = 0;
        let unresolvedCount = 0;
      
        for (const candidate of candidates) {
  215:     const normalizedSlug = normalizeCategoryCandidateSlug(candidate.slug);
      
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

----- .\lib\activity\categoryDerivation\resolver.ts:217 | pattern: normalizedSlug -----
        const warnings: string[] = [];
        const errors: string[] = [];
      
        let createdCount = 0;
        let reusedCount = 0;
        let unresolvedCount = 0;
      
        for (const candidate of candidates) {
          const normalizedSlug = normalizeCategoryCandidateSlug(candidate.slug);
      
  217:     if (normalizedSlug.length === 0) {
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

----- .\lib\activity\categoryDerivation\resolver.ts:226 | pattern: normalizedSlug -----
      
          if (normalizedSlug.length === 0) {
            unresolvedCount += 1;
            warnings.push(`Candidate slug could not be normalized: ${candidate.slug}`);
            resolved.push({
              ...candidate,
              categoryId: null,
              resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
  226:           normalizedSlug,
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

----- .\lib\activity\categoryDerivation\resolver.ts:238 | pattern: normalizedSlug -----
              },
            });
            continue;
          }
      
          const semanticLayer = candidate.semanticLayer
            ? String(candidate.semanticLayer)
            : undefined;
          const existing = await findExistingCategory(
            supabase,
  238:       normalizedSlug,
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

----- .\lib\activity\categoryDerivation\resolver.ts:243 | pattern: normalizedSlug -----
          const semanticLayer = candidate.semanticLayer
            ? String(candidate.semanticLayer)
            : undefined;
          const existing = await findExistingCategory(
            supabase,
            normalizedSlug,
            semanticLayer,
          );
      
          if (existing.error) {
  243:       errors.push(`Lookup failed for ${normalizedSlug}: ${existing.error}`);
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

----- .\lib\activity\categoryDerivation\resolver.ts:250 | pattern: normalizedSlug -----
          );
      
          if (existing.error) {
            errors.push(`Lookup failed for ${normalizedSlug}: ${existing.error}`);
          }
      
          if (existing.row?.id) {
            reusedCount += 1;
            resolved.push({
              ...candidate,
  250:         slug: normalizedSlug,
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

----- .\lib\activity\categoryDerivation\resolver.ts:260 | pattern: normalizedSlug -----
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
  260:           normalizedSlug,
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
      
          const created = await createCategory(supabase, candidate, normalizedSlug, {
            ...options,

----- .\lib\activity\categoryDerivation\resolver.ts:271 | pattern: normalizedSlug -----
                existingStatus: existing.row.status ?? null,
              },
            });
            continue;
          }
      
          if (!shouldCreateCategory(candidate, createPolicy) || options.dryRun) {
            unresolvedCount += 1;
            resolved.push({
              ...candidate,
  271:         slug: normalizedSlug,
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
      
          const created = await createCategory(supabase, candidate, normalizedSlug, {
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
```

## 6.6 Resolver function exports

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\resolver.ts:200 | pattern: export async function -----
        return {
          row: result.data ?? null,
          error: errorMessage(result.error),
        };
      }
      
  200: export async function resolveCategoryCandidates(
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
```

## 7. Next step

Proceed to P4.10.0-C8-P3-B6-D-C:

- patch resolver with context_id resolution
- probably add helper findDefaultCategoryDerivationContextId()
- use context code personal_activity
- ensure contextual_categories select/upsert includes context_id
- run resolver smoke check
- rerun browser Case 3 non-dryRun
