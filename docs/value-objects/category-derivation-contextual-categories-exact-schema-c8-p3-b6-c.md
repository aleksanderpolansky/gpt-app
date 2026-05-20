# P4.10.0-C8-P3-B6-C — Exact contextual_categories Schema and Resolver Create Path

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / contextual_categories context_id failure

Purpose: prepare the resolver fix by identifying the exact required schema and creation path.

## 1. Git status

```text
?? docs/value-objects/category-derivation-contextual-categories-exact-schema-c8-p3-b6-c.md
```

## 2. Recent commits

```text
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
e6393a6 Restore full category derivation route-side integration map
b05ed56 Map category derivation route-side bridge integration
```

## 3. Target file status

```text
.\supabase\migrations\001_object_action_backbone.sql => FOUND, 722 lines
.\lib\activity\categoryDerivation\resolver.ts => FOUND, 349 lines
.\lib\activity\categoryDerivation\types.ts => FOUND, 132 lines
.\src\app\api\activity\debug\free-text-value-object-test\route.ts => FOUND, 952 lines
```

## 4. Migration exact block — contexts table

```text
  187: create table if not exists contexts (
  188:   id uuid primary key default gen_random_uuid(),
  189:   code text not null,
  190:   name text not null,
  191:   description text,
  192:   status text not null default 'approved',
  193:   source_type text not null default 'system_seed',
  194:   sort_order integer not null default 100,
  195:   is_active boolean not null default true,
  196:   created_at timestamp with time zone not null default now(),
  197:   updated_at timestamp with time zone not null default now(),
  198: 
  199:   constraint contexts_code_not_empty
  200:     check (length(trim(code)) > 0),
  201: 
  202:   constraint contexts_name_not_empty
  203:     check (length(trim(name)) > 0),
  204: 
  205:   constraint contexts_status_allowed
  206:     check (
  207:       status in (
  208:         'draft',
  209:         'suggested',
  210:         'needs_review',
  211:         'approved',
  212:         'published',
  213:         'hidden',
  214:         'flagged',
  215:         'rejected',
  216:         'archived'
  217:       )
  218:     ),
  219: 
  220:   constraint contexts_source_type_allowed
  221:     check (
  222:       source_type in (
  223:         'system_seed',
  224:         'manual',
  225:         'ai_suggested',
  226:         'imported',
  227:         'migrated',
  228:         'owner_confirmed',
  229:         'platform_verified'
  230:       )
  231:     )
  232: );
  233: 
  234: create unique index if not exists contexts_code_unique_idx
  235: on contexts (lower(code));
  236: 
  237: create index if not exists contexts_status_idx
  238: on contexts (status);
  239: 
  240: create index if not exists contexts_is_active_idx
  241: on contexts (is_active);
  242: 
```

## 5. Migration exact block — object_action_affordances context_id reference

```text
  243: create table if not exists object_action_affordances (
  244:   id uuid primary key default gen_random_uuid(),
  245:   object_type_id uuid not null references object_types(id) on delete cascade,
  246:   action_type_id uuid not null references action_types(id) on delete cascade,
  247:   context_id uuid references contexts(id) on delete cascade,
  248:   is_default boolean not null default false,
  249:   status text not null default 'approved',
  250:   source_type text not null default 'system_seed',
  251:   notes text,
  252:   created_at timestamp with time zone not null default now(),
  253:   updated_at timestamp with time zone not null default now(),
  254: 
  255:   constraint object_action_affordances_status_allowed
  256:     check (
  257:       status in (
  258:         'draft',
  259:         'suggested',
  260:         'needs_review',
  261:         'approved',
  262:         'published',
  263:         'hidden',
  264:         'flagged',
  265:         'rejected',
  266:         'archived'
  267:       )
  268:     ),
  269: 
  270:   constraint object_action_affordances_source_type_allowed
  271:     check (
  272:       source_type in (
  273:         'system_seed',
  274:         'manual',
  275:         'ai_suggested',
  276:         'imported',
  277:         'migrated',
  278:         'owner_confirmed',
  279:         'platform_verified'
  280:       )
  281:     )
  282: );
  283: 
  284: create unique index if not exists object_action_affordances_unique_idx
  285: on object_action_affordances (
  286:   object_type_id,
  287:   action_type_id,
  288:   coalesce(context_id, '00000000-0000-0000-0000-000000000000'::uuid)
  289: );
  290: 
  291: create index if not exists object_action_affordances_object_type_id_idx
  292: on object_action_affordances (object_type_id);
  293: 
  294: create index if not exists object_action_affordances_action_type_id_idx
  295: on object_action_affordances (action_type_id);
  296: 
  297: create index if not exists object_action_affordances_context_id_idx
  298: on object_action_affordances (context_id);
  299: 
```

## 6. Migration exact block — contextual_categories table

```text
  300: create table if not exists contextual_categories (
  301:   id uuid primary key default gen_random_uuid(),
  302:   context_id uuid not null references contexts(id) on delete cascade,
  303:   parent_id uuid references contextual_categories(id) on delete set null,
  304:   slug text not null,
  305:   name text not null,
  306:   description text,
  307:   status text not null default 'approved',
  308:   source_type text not null default 'system_seed',
  309:   sort_order integer not null default 100,
  310:   is_active boolean not null default true,
  311:   created_at timestamp with time zone not null default now(),
  312:   updated_at timestamp with time zone not null default now(),
  313: 
  314:   constraint contextual_categories_slug_not_empty
  315:     check (length(trim(slug)) > 0),
  316: 
  317:   constraint contextual_categories_name_not_empty
  318:     check (length(trim(name)) > 0),
  319: 
  320:   constraint contextual_categories_status_allowed
  321:     check (
  322:       status in (
  323:         'draft',
  324:         'suggested',
  325:         'needs_review',
  326:         'approved',
  327:         'published',
  328:         'hidden',
  329:         'flagged',
  330:         'rejected',
  331:         'archived'
  332:       )
  333:     ),
  334: 
  335:   constraint contextual_categories_source_type_allowed
  336:     check (
  337:       source_type in (
  338:         'system_seed',
  339:         'manual',
  340:         'ai_suggested',
  341:         'imported',
  342:         'migrated',
  343:         'owner_confirmed',
  344:         'platform_verified'
  345:       )
  346:     )
  347: );
  348: 
  349: create unique index if not exists contextual_categories_context_slug_unique_idx
  350: on contextual_categories (context_id, lower(slug));
  351: 
  352: create index if not exists contextual_categories_context_id_idx
  353: on contextual_categories (context_id);
  354: 
  355: create index if not exists contextual_categories_parent_id_idx
  356: on contextual_categories (parent_id);
```

## 7. Migration exact block — entity_classifications context/category usage

```text
  357: 
  358: create index if not exists contextual_categories_status_idx
  359: on contextual_categories (status);
  360: 
  361: create index if not exists contextual_categories_is_active_idx
  362: on contextual_categories (is_active);
  363: 
  364: create table if not exists entity_classifications (
  365:   id uuid primary key default gen_random_uuid(),
  366:   entity_type text not null,
  367:   entity_id uuid not null,
  368:   object_type_id uuid not null references object_types(id) on delete restrict,
  369:   action_type_id uuid references action_types(id) on delete restrict,
  370:   context_id uuid not null references contexts(id) on delete restrict,
  371:   contextual_category_id uuid references contextual_categories(id) on delete restrict,
  372:   classification_role text not null default 'primary',
  373:   is_primary boolean not null default false,
  374:   confidence numeric,
  375:   status text not null default 'approved',
  376:   source_type text not null default 'manual',
  377:   classified_by_user_id uuid,
  378:   evidence_json jsonb not null default '{}'::jsonb,
  379:   notes text,
  380:   created_at timestamp with time zone not null default now(),
  381:   updated_at timestamp with time zone not null default now(),
  382: 
  383:   constraint entity_classifications_entity_type_not_empty
  384:     check (length(trim(entity_type)) > 0),
  385: 
  386:   constraint entity_classifications_role_allowed
```

## 8. Migration exact block — seed/index area after contextual categories

```text
  387:     check (
  388:       classification_role in (
  389:         'primary',
  390:         'secondary',
  391:         'tag',
  392:         'system',
  393:         'ai_suggestion',
  394:         'owner_selected',
  395:         'admin_selected'
  396:       )
  397:     ),
  398: 
  399:   constraint entity_classifications_confidence_range
  400:     check (
  401:       confidence is null
  402:       or (confidence >= 0 and confidence <= 1)
  403:     ),
  404: 
  405:   constraint entity_classifications_status_allowed
  406:     check (
  407:       status in (
  408:         'draft',
  409:         'suggested',
  410:         'needs_review',
  411:         'approved',
  412:         'published',
  413:         'hidden',
  414:         'flagged',
  415:         'rejected',
  416:         'archived'
  417:       )
  418:     ),
  419: 
  420:   constraint entity_classifications_source_type_allowed
  421:     check (
  422:       source_type in (
  423:         'system_seed',
  424:         'manual',
  425:         'ai_suggested',
  426:         'imported',
  427:         'migrated',
  428:         'owner_confirmed',
  429:         'platform_verified'
  430:       )
```

## 9. Resolver — contextual_categories usage

```text
MATCH COUNT: 2

----- .\lib\activity\categoryDerivation\resolver.ts:93 | pattern: contextual_categories -----
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

----- .\lib\activity\categoryDerivation\resolver.ts:189 | pattern: contextual_categories -----
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
```

## 10. Resolver — context_id usage

```text
NO MATCH: context_id
```

## 11. Resolver — insert calls

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
```

## 12. Resolver — created_suggested status

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

## 13. Resolver — createPolicy logic

```text
MATCH COUNT: 13

----- .\lib\activity\categoryDerivation\resolver.ts:8 | pattern: createPolicy -----
      import type {
        CategoryCandidate,
        CategoryResolutionResult,
        JsonRecord,
        ResolvedCategoryCandidate,
      } from "./types";
      
    8: export type CategoryResolverCreatePolicy =
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
        eq(column: string, value: string): SupabaseSelectBuilder<T>;
        limit(count: number): SupabaseSelectBuilder<T>;
        maybeSingle(): Promise<SupabaseMaybeSingleResult<T>>;
      }
      
      interface SupabaseInsertBuilder<T> {
        select(columns?: string): SupabaseInsertBuilder<T>;

----- .\lib\activity\categoryDerivation\resolver.ts:14 | pattern: createPolicy -----
        JsonRecord,
        ResolvedCategoryCandidate,
      } from "./types";
      
      export type CategoryResolverCreatePolicy =
        | "never"
        | "suggested_only"
        | "active_for_confirmed_required";
      
      export interface CategoryResolverOptions {
   14:   createPolicy?: CategoryResolverCreatePolicy;
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

----- .\lib\activity\categoryDerivation\resolver.ts:111 | pattern: createPolicy -----
        const result = await query.limit(1).maybeSingle();
      
        return {
          row: result.data ?? null,
          error: errorMessage(result.error),
        };
      }
      
      function shouldCreateCategory(
        candidate: CategoryCandidate,
  111:   createPolicy: CategoryResolverCreatePolicy,
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
      

----- .\lib\activity\categoryDerivation\resolver.ts:113 | pattern: createPolicy -----
        return {
          row: result.data ?? null,
          error: errorMessage(result.error),
        };
      }
      
      function shouldCreateCategory(
        candidate: CategoryCandidate,
        createPolicy: CategoryResolverCreatePolicy,
      ): boolean {
  113:   if (createPolicy === "never") {
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

----- .\lib\activity\categoryDerivation\resolver.ts:117 | pattern: createPolicy -----
      }
      
      function shouldCreateCategory(
        candidate: CategoryCandidate,
        createPolicy: CategoryResolverCreatePolicy,
      ): boolean {
        if (createPolicy === "never") {
          return false;
        }
      
  117:   if (createPolicy === "suggested_only") {
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

----- .\lib\activity\categoryDerivation\resolver.ts:126 | pattern: createPolicy -----
      
        if (createPolicy === "suggested_only") {
          return true;
        }
      
        return Boolean(candidate.isRequired && candidate.isConfirmed);
      }
      
      function categoryStatusForCandidate(
        candidate: CategoryCandidate,
  126:   options: Required<Pick<CategoryResolverOptions, "createPolicy">> &
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

----- .\lib\activity\categoryDerivation\resolver.ts:138 | pattern: createPolicy -----
      ): "active" | "suggested" | "needs_review" {
        if (candidate.needsUserReview) {
          return "needs_review";
        }
      
        if (options.defaultStatus) {
          return options.defaultStatus;
        }
      
        if (
  138:     options.createPolicy === "active_for_confirmed_required" &&
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

----- .\lib\activity\categoryDerivation\resolver.ts:152 | pattern: createPolicy -----
          return "active";
        }
      
        return "suggested";
      }
      
      async function createCategory(
        supabase: CategoryResolverSupabaseClient,
        candidate: CategoryCandidate,
        normalizedSlug: string,
  152:   options: Required<Pick<CategoryResolverOptions, "createPolicy">> &
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
            ...(candidate.metadata ?? {}),

----- .\lib\activity\categoryDerivation\resolver.ts:205 | pattern: createPolicy -----
          row: result.data ?? null,
          error: errorMessage(result.error),
        };
      }
      
      export async function resolveCategoryCandidates(
        supabase: CategoryResolverSupabaseClient,
        candidates: CategoryCandidate[],
        options: CategoryResolverOptions = {},
      ): Promise<CategoryResolutionResult> {
  205:   const createPolicy = options.createPolicy ?? "suggested_only";
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
                normalizedSlug,
                resolverWarning: "empty_normalized_slug",
              },
            });
            continue;

----- .\lib\activity\categoryDerivation\resolver.ts:267 | pattern: createPolicy -----
              resolutionStatus: "resolved_existing",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                existingStatus: existing.row.status ?? null,
              },
            });
            continue;
          }
      
  267:     if (!shouldCreateCategory(candidate, createPolicy) || options.dryRun) {
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
            createPolicy,
          });
      
          if (created.error || !created.row?.id) {
            unresolvedCount += 1;
            errors.push(
              `Create failed for ${normalizedSlug}: ${
```

## 14. Resolver — normalizedSlug logic

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

## 15. Types — category/context fields

```text
MATCH COUNT: 1

----- .\lib\activity\categoryDerivation\types.ts:59 | pattern: categoryId -----
        source: CategoryDerivationSource;
        isRequired?: boolean;
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
      export interface ResolvedCategoryCandidate extends CategoryCandidate {
   59:   categoryId: string | null;
        resolutionStatus: CategoryDerivationResolutionStatus;
      }
      
      export interface CategoryDerivationInput {
        activityEventId?: string;
        inputText: string;
        title?: string | null;
        description?: string | null;
        durationMinutes?: number | null;
        inputLanguage?: string | null;
        actorId?: string | null;
        organizationId?: string | null;
        metadata?: JsonRecord;
      }
      
      export interface CategoryDerivationResult {
        ok: boolean;
        skipped?: boolean;
        skipReason?: string | null;
        processorVersion: string;
```

## 16. Route — category derivation result usage

```text
MATCH COUNT: 33

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:319 | pattern: categoryDerivationResult -----
        if (!Array.isArray(value)) {
          return [];
        }
      
        return value.filter(isRecord);
      }
      
      function collectPossibleResolvedCandidates(
  319:   categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
        if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      
        const direct = readObjectArray(categoryDerivationResult.resolvedCandidates);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const resolution = isRecord(categoryDerivationResult.resolution)
          ? categoryDerivationResult.resolution
          : null;
      
        if (resolution) {
          const fromResolution = readObjectArray(resolution.resolvedCandidates);
      
          if (fromResolution.length > 0) {
            return fromResolution;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:321 | pattern: categoryDerivationResult -----
        }
      
        return value.filter(isRecord);
      }
      
      function collectPossibleResolvedCandidates(
        categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
  321:   if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      
        const direct = readObjectArray(categoryDerivationResult.resolvedCandidates);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const resolution = isRecord(categoryDerivationResult.resolution)
          ? categoryDerivationResult.resolution
          : null;
      
        if (resolution) {
          const fromResolution = readObjectArray(resolution.resolvedCandidates);
      
          if (fromResolution.length > 0) {
            return fromResolution;
          }
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:325 | pattern: categoryDerivationResult -----
      
      function collectPossibleResolvedCandidates(
        categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
        if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      
  325:   const direct = readObjectArray(categoryDerivationResult.resolvedCandidates);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const resolution = isRecord(categoryDerivationResult.resolution)
          ? categoryDerivationResult.resolution
          : null;
      
        if (resolution) {
          const fromResolution = readObjectArray(resolution.resolvedCandidates);
      
          if (fromResolution.length > 0) {
            return fromResolution;
          }
      
          const fromResolutionCandidates = readObjectArray(resolution.candidates);
      
          if (fromResolutionCandidates.length > 0) {
            return fromResolutionCandidates;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:331 | pattern: categoryDerivationResult -----
        }
      
        const direct = readObjectArray(categoryDerivationResult.resolvedCandidates);
      
        if (direct.length > 0) {
          return direct;
        }
      
  331:   const resolution = isRecord(categoryDerivationResult.resolution)
          ? categoryDerivationResult.resolution
          : null;
      
        if (resolution) {
          const fromResolution = readObjectArray(resolution.resolvedCandidates);
      
          if (fromResolution.length > 0) {
            return fromResolution;
          }
      
          const fromResolutionCandidates = readObjectArray(resolution.candidates);
      
          if (fromResolutionCandidates.length > 0) {
            return fromResolutionCandidates;
          }
        }
      
        const result = isRecord(categoryDerivationResult.result)
          ? categoryDerivationResult.result
          : null;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:332 | pattern: categoryDerivationResult -----
      
        const direct = readObjectArray(categoryDerivationResult.resolvedCandidates);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const resolution = isRecord(categoryDerivationResult.resolution)
  332:     ? categoryDerivationResult.resolution
          : null;
      
        if (resolution) {
          const fromResolution = readObjectArray(resolution.resolvedCandidates);
      
          if (fromResolution.length > 0) {
            return fromResolution;
          }
      
          const fromResolutionCandidates = readObjectArray(resolution.candidates);
      
          if (fromResolutionCandidates.length > 0) {
            return fromResolutionCandidates;
          }
        }
      
        const result = isRecord(categoryDerivationResult.result)
          ? categoryDerivationResult.result
          : null;
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:349 | pattern: categoryDerivationResult -----
      
          const fromResolutionCandidates = readObjectArray(resolution.candidates);
      
          if (fromResolutionCandidates.length > 0) {
            return fromResolutionCandidates;
          }
        }
      
  349:   const result = isRecord(categoryDerivationResult.result)
          ? categoryDerivationResult.result
          : null;
      
        if (result) {
          const fromResult = readObjectArray(result.resolvedCandidates);
      
          if (fromResult.length > 0) {
            return fromResult;
          }
        }
      
        return [];
      }
      
      function collectPossibleDerivationRows(
        categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
        if (!isRecord(categoryDerivationResult)) {
          return [];
        }

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:350 | pattern: categoryDerivationResult -----
          const fromResolutionCandidates = readObjectArray(resolution.candidates);
      
          if (fromResolutionCandidates.length > 0) {
            return fromResolutionCandidates;
          }
        }
      
        const result = isRecord(categoryDerivationResult.result)
  350:     ? categoryDerivationResult.result
          : null;
      
        if (result) {
          const fromResult = readObjectArray(result.resolvedCandidates);
      
          if (fromResult.length > 0) {
            return fromResult;
          }
        }
      
        return [];
      }
      
      function collectPossibleDerivationRows(
        categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
        if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:365 | pattern: categoryDerivationResult -----
            return fromResult;
          }
        }
      
        return [];
      }
      
      function collectPossibleDerivationRows(
  365:   categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
        if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      
        const direct = readObjectArray(categoryDerivationResult.activityCategoryDerivations);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const persistence = isRecord(categoryDerivationResult.persistence)
          ? categoryDerivationResult.persistence
          : null;
      
        if (persistence) {
          const fromPersistence = readObjectArray(
            persistence.activityCategoryDerivations
          );
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:367 | pattern: categoryDerivationResult -----
        }
      
        return [];
      }
      
      function collectPossibleDerivationRows(
        categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
  367:   if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      
        const direct = readObjectArray(categoryDerivationResult.activityCategoryDerivations);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const persistence = isRecord(categoryDerivationResult.persistence)
          ? categoryDerivationResult.persistence
          : null;
      
        if (persistence) {
          const fromPersistence = readObjectArray(
            persistence.activityCategoryDerivations
          );
      
          if (fromPersistence.length > 0) {
            return fromPersistence;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:371 | pattern: categoryDerivationResult -----
      
      function collectPossibleDerivationRows(
        categoryDerivationResult: unknown
      ): Record<string, unknown>[] {
        if (!isRecord(categoryDerivationResult)) {
          return [];
        }
      
  371:   const direct = readObjectArray(categoryDerivationResult.activityCategoryDerivations);
      
        if (direct.length > 0) {
          return direct;
        }
      
        const persistence = isRecord(categoryDerivationResult.persistence)
          ? categoryDerivationResult.persistence
          : null;
      
        if (persistence) {
          const fromPersistence = readObjectArray(
            persistence.activityCategoryDerivations
          );
      
          if (fromPersistence.length > 0) {
            return fromPersistence;
          }
      
          const fromRows = readObjectArray(persistence.rows);
      
```

## 17. Working questions for next patch

- Does contextual_categories require context_id always? Expected from browser error: yes.
- Is there a global/default context row already seeded?
- Should resolver resolve context by semanticLayer/categoryType?
- Should resolver create missing context first?
- Should resolver avoid creating contextual_categories for metric categories like duration-minutes?
- Should createPolicy=suggested_only create category rows, or only mark suggestions without active category creation?

## 18. Next step

Proceed to P4.10.0-C8-P3-B6-D:

- decide minimal resolver fix
- likely add context_id resolution before contextual_categories insert
- run resolver smoke check
- rerun browser Case 3 non-dryRun
