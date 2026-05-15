# P4.7.1-R Rubricator Inventory Raw

Generated: 2026-05-15 19:59:57

Purpose: inventory of existing Object-Action Rubricator code/schema before connecting Value Object State Foundation to classification layer.

Important: diagnostic only. This file does not change schema, routes or code.

Architectural rule after v4.1-R:

Activity Event -> Object Type + Action Type + Context -> Contextual Category / Entity Classification -> Value Object / VOI -> State Delta / Aggregates

## Git checkpoint

### git status --short

No output.

### git log --oneline -n 10

    d2823f3 Add value object bridge helper
    58a30b5 Add value object state foundation schema
    8803bd4 Document imported pending edit audit stabilization
    c649ae9 Expose correction status in activity debug trace
    905e350 Add audit rows for imported pending event edits
    4a09793 Document imported pending template correction tests
    3a00790 Fix legacy template id in imported reject response
    ea58e7c Allow template correction for imported activity events
    70cd041 Show imported template mapping in review responses
    92a9bae Document activity template mapping P4.4

## Files scanned

Total files scanned: 161


---

## Term: object_classes

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (15 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (5 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:15 - create table if not exists object_classes (
- .\supabase\migrations\001_object_action_backbone.sql:27 - constraint object_classes_code_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:30 - constraint object_classes_name_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:33 - constraint object_classes_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:48 - constraint object_classes_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:62 - create unique index if not exists object_classes_code_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:63 - on object_classes (lower(code));
- .\supabase\migrations\001_object_action_backbone.sql:65 - create index if not exists object_classes_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:66 - on object_classes (status);
- .\supabase\migrations\001_object_action_backbone.sql:68 - create index if not exists object_classes_is_active_idx
- .\supabase\migrations\001_object_action_backbone.sql:69 - on object_classes (is_active);
- .\supabase\migrations\001_object_action_backbone.sql:73 - object_class_id uuid not null references object_classes(id) on delete restrict,
- .\supabase\migrations\001_object_action_backbone.sql:614 - select 1 from pg_trigger where tgname = 'object_classes_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:616 - create trigger object_classes_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:617 - before update on object_classes
- .\supabase\migrations\002_seed_object_action_rubricator.sql:3 - insert into object_classes (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:34 - from object_classes existing
- .\supabase\migrations\002_seed_object_action_rubricator.sql:49 - object_classes.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:78 - join object_classes
- .\supabase\migrations\002_seed_object_action_rubricator.sql:79 - on lower(object_classes.code) = lower(seed.class_code)

---

## Term: object_types

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (19 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (6 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (4 matches)
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql (8 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (1 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\lib\objectAction\queries.ts (2 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:71 - create table if not exists object_types (
- .\supabase\migrations\001_object_action_backbone.sql:84 - constraint object_types_code_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:87 - constraint object_types_name_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:90 - constraint object_types_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:105 - constraint object_types_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:119 - create unique index if not exists object_types_code_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:120 - on object_types (lower(code));
- .\supabase\migrations\001_object_action_backbone.sql:122 - create index if not exists object_types_object_class_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:123 - on object_types (object_class_id);
- .\supabase\migrations\001_object_action_backbone.sql:125 - create index if not exists object_types_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:126 - on object_types (status);
- .\supabase\migrations\001_object_action_backbone.sql:128 - create index if not exists object_types_is_active_idx
- .\supabase\migrations\001_object_action_backbone.sql:129 - on object_types (is_active);
- .\supabase\migrations\001_object_action_backbone.sql:245 - object_type_id uuid not null references object_types(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:368 - object_type_id uuid not null references object_types(id) on delete restrict,
- .\supabase\migrations\001_object_action_backbone.sql:468 - object_type_id uuid not null references object_types(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:623 - select 1 from pg_trigger where tgname = 'object_types_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:625 - create trigger object_types_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:626 - before update on object_types
- .\supabase\migrations\002_seed_object_action_rubricator.sql:38 - insert into object_types (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:82 - from object_types existing
- .\supabase\migrations\002_seed_object_action_rubricator.sql:255 - object_types.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:319 - join object_types
- .\supabase\migrations\002_seed_object_action_rubricator.sql:320 - on lower(object_types.code) = lower(seed.object_type_code)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:328 - where existing.object_type_id = object_types.id
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:21 - object_types.id as object_type_id,
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:51 - join object_types
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:52 - on lower(object_types.code) = 'organization'
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:65 - and existing.object_type_id = object_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:175 - object_types.id as object_type_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:176 - object_types.code as object_type_code,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:177 - object_types.name as object_type_name,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:185 - from object_types
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:191 - on object_action_affordances.object_type_id = object_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:195 - where lower(object_types.code) = lower(trim(p_object_type_code))
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:196 - and object_types.is_active = true
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:197 - and object_types.status in ('approved', 'published')
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:31 - ai_suggested_object_type_id uuid references object_types(id) on delete set null,
- .\src\app\admin\object-action\classifications\page.tsx:604 - .from("object_types")
- .\lib\objectAction\queries.ts:251 - .from("object_types")
- .\lib\objectAction\queries.ts:296 - .from("object_types")
- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

---

## Term: action_types

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (17 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (6 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (4 matches)
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql (8 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (1 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\lib\objectAction\queries.ts (1 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:131 - create table if not exists action_types (
- .\supabase\migrations\001_object_action_backbone.sql:143 - constraint action_types_code_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:146 - constraint action_types_name_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:149 - constraint action_types_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:164 - constraint action_types_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:178 - create unique index if not exists action_types_code_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:179 - on action_types (lower(code));
- .\supabase\migrations\001_object_action_backbone.sql:181 - create index if not exists action_types_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:182 - on action_types (status);
- .\supabase\migrations\001_object_action_backbone.sql:184 - create index if not exists action_types_is_active_idx
- .\supabase\migrations\001_object_action_backbone.sql:185 - on action_types (is_active);
- .\supabase\migrations\001_object_action_backbone.sql:246 - action_type_id uuid not null references action_types(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:369 - action_type_id uuid references action_types(id) on delete restrict,
- .\supabase\migrations\001_object_action_backbone.sql:487 - action_type_id uuid not null references action_types(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:632 - select 1 from pg_trigger where tgname = 'action_types_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:634 - create trigger action_types_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:635 - before update on action_types
- .\supabase\migrations\002_seed_object_action_rubricator.sql:86 - insert into action_types (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:132 - from action_types existing
- .\supabase\migrations\002_seed_object_action_rubricator.sql:256 - action_types.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:321 - join action_types
- .\supabase\migrations\002_seed_object_action_rubricator.sql:322 - on lower(action_types.code) = lower(seed.action_type_code)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:329 - and existing.action_type_id = action_types.id
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:22 - action_types.id as action_type_id,
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:53 - join action_types
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:54 - on lower(action_types.code) = 'classify'
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:66 - and existing.action_type_id = action_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:178 - action_types.id as action_type_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:179 - action_types.code as action_type_code,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:180 - action_types.name as action_type_name,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:186 - join action_types
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:187 - on lower(action_types.code) = lower(trim(p_action_type_code))
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:192 - and object_action_affordances.action_type_id = action_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:198 - and action_types.is_active = true
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:199 - and action_types.status in ('approved', 'published')
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:32 - ai_suggested_action_type_id uuid references action_types(id) on delete set null,
- .\src\app\admin\object-action\classifications\page.tsx:611 - .from("action_types")
- .\lib\objectAction\queries.ts:382 - .from("action_types")
- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

---

## Term: contexts

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (18 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (18 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (5 matches)
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql (22 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (1 matches)
- .\supabase\migrations\012_activity_recording_backbone.sql (2 matches)
- .\supabase\migrations\013_activity_templates_v2.sql (1 matches)
- .\src\app\activity-capture\page.tsx (1 matches)
- .\src\app\admin\object-action\categories\page.tsx (18 matches)
- .\src\app\admin\object-action\classifications\page.tsx (14 matches)
- .\src\app\api\directory\organizations\route.ts (1 matches)
- .\src\app\api\object-action\suggestions\route.ts (1 matches)
- .\lib\objectAction\queries.ts (9 matches)
- .\docs\p4-7-schema-inventory-raw.md (2 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:187 - create table if not exists contexts (
- .\supabase\migrations\001_object_action_backbone.sql:199 - constraint contexts_code_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:202 - constraint contexts_name_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:205 - constraint contexts_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:220 - constraint contexts_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:234 - create unique index if not exists contexts_code_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:235 - on contexts (lower(code));
- .\supabase\migrations\001_object_action_backbone.sql:237 - create index if not exists contexts_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:238 - on contexts (status);
- .\supabase\migrations\001_object_action_backbone.sql:240 - create index if not exists contexts_is_active_idx
- .\supabase\migrations\001_object_action_backbone.sql:241 - on contexts (is_active);
- .\supabase\migrations\001_object_action_backbone.sql:247 - context_id uuid references contexts(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:302 - context_id uuid not null references contexts(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:370 - context_id uuid not null references contexts(id) on delete restrict,
- .\supabase\migrations\001_object_action_backbone.sql:506 - context_id uuid not null references contexts(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:641 - select 1 from pg_trigger where tgname = 'contexts_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:643 - create trigger contexts_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:644 - before update on contexts
- .\supabase\migrations\002_seed_object_action_rubricator.sql:136 - insert into contexts (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:171 - from contexts existing
- .\supabase\migrations\002_seed_object_action_rubricator.sql:187 - contexts.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:236 - join contexts
- .\supabase\migrations\002_seed_object_action_rubricator.sql:237 - on lower(contexts.code) = lower(seed.context_code)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:241 - where existing.context_id = contexts.id
- .\supabase\migrations\002_seed_object_action_rubricator.sql:257 - contexts.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:317 - ('note', 'classify', 'content', true, 'Notes can be classified and routed to contexts.')
- .\supabase\migrations\002_seed_object_action_rubricator.sql:323 - join contexts
- .\supabase\migrations\002_seed_object_action_rubricator.sql:324 - on lower(contexts.code) = lower(seed.context_code)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:331 - = coalesce(contexts.id, '00000000-0000-0000-0000-000000000000'::uuid)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:341 - contexts.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:361 - join contexts
- .\supabase\migrations\002_seed_object_action_rubricator.sql:362 - on lower(contexts.code) = lower(seed.context_code)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:366 - where existing.context_id = contexts.id
- .\supabase\migrations\002_seed_object_action_rubricator.sql:396 - join contexts
- .\supabase\migrations\002_seed_object_action_rubricator.sql:397 - on lower(contexts.code) = lower(seed.context_code)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:399 - on contextual_categories.context_id = contexts.id
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:23 - contexts.id as context_id,
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:55 - join contexts
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:56 - on lower(contexts.code) = 'business_directory'
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:58 - on contextual_categories.context_id = contexts.id
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:67 - and existing.context_id = contexts.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:9 - contexts.code as context_code,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:10 - contexts.name as context_default_name,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:24 - join contexts
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25 - on contexts.id = contextual_categories.context_id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:30 - and contexts.is_active = true
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:31 - and contexts.status in ('approved', 'published');
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:84 - contexts.id as context_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:85 - contexts.code as context_code,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:113 - join contexts
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:114 - on contexts.id = contextual_categories.context_id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:128 - and contexts.is_active = true
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:129 - and contexts.status in ('approved', 'published')
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:133 - or lower(contexts.code) = lower(trim(p_context_code))
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:136 - contexts.sort_order,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:181 - contexts.id as context_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:182 - contexts.code as context_code,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:183 - contexts.name as context_name,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:188 - join contexts
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:189 - on lower(contexts.code) = lower(trim(p_context_code))

References truncated. Total matches: 113

---

## Term: affordances

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (14 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (2 matches)
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql (6 matches)
- .\lib\objectAction\queries.ts (6 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:243 - create table if not exists object_action_affordances (
- .\supabase\migrations\001_object_action_backbone.sql:255 - constraint object_action_affordances_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:270 - constraint object_action_affordances_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:284 - create unique index if not exists object_action_affordances_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:285 - on object_action_affordances (
- .\supabase\migrations\001_object_action_backbone.sql:291 - create index if not exists object_action_affordances_object_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:292 - on object_action_affordances (object_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:294 - create index if not exists object_action_affordances_action_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:295 - on object_action_affordances (action_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:297 - create index if not exists object_action_affordances_context_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:298 - on object_action_affordances (context_id);
- .\supabase\migrations\001_object_action_backbone.sql:650 - select 1 from pg_trigger where tgname = 'object_action_affordances_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:652 - create trigger object_action_affordances_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:653 - before update on object_action_affordances
- .\supabase\migrations\002_seed_object_action_rubricator.sql:245 - insert into object_action_affordances (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:327 - from object_action_affordances existing
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:184 - object_action_affordances.id as affordance_id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:190 - left join object_action_affordances
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:191 - on object_action_affordances.object_type_id = object_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:192 - and object_action_affordances.action_type_id = action_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:193 - and object_action_affordances.context_id = contexts.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:194 - and object_action_affordances.status in ('approved', 'published')
- .\lib\objectAction\queries.ts:344 - .from("object_action_affordances")
- .\lib\objectAction\queries.ts:360 - logObjectActionError("getActionsForObjectType affordances", affordanceError);
- .\lib\objectAction\queries.ts:364 - const affordances =
- .\lib\objectAction\queries.ts:374 - new Set(affordances.map((item) => item.action_type_id))
- .\lib\objectAction\queries.ts:400 - affordances
- .\lib\objectAction\queries.ts:421 - const options = affordances

---

## Term: contextual_categories

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (21 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (7 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (5 matches)
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql (74 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (2 matches)
- .\supabase\migrations\010_create_object_action_suggestion_events.sql (2 matches)
- .\src\app\admin\object-action\categories\page.tsx (1 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\src\app\api\directory\filters\route.ts (1 matches)
- .\src\app\api\directory\organizations\route.ts (1 matches)
- .\src\app\api\object-action\categories\route.ts (2 matches)
- .\src\app\api\object-action\categories\audit-verify\route.ts (1 matches)
- .\src\app\api\object-action\suggestions\route.ts (5 matches)
- .\lib\objectAction\queries.ts (2 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:300 - create table if not exists contextual_categories (
- .\supabase\migrations\001_object_action_backbone.sql:303 - parent_id uuid references contextual_categories(id) on delete set null,
- .\supabase\migrations\001_object_action_backbone.sql:314 - constraint contextual_categories_slug_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:317 - constraint contextual_categories_name_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:320 - constraint contextual_categories_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:335 - constraint contextual_categories_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:349 - create unique index if not exists contextual_categories_context_slug_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:350 - on contextual_categories (context_id, lower(slug));
- .\supabase\migrations\001_object_action_backbone.sql:352 - create index if not exists contextual_categories_context_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:353 - on contextual_categories (context_id);
- .\supabase\migrations\001_object_action_backbone.sql:355 - create index if not exists contextual_categories_parent_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:356 - on contextual_categories (parent_id);
- .\supabase\migrations\001_object_action_backbone.sql:358 - create index if not exists contextual_categories_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:359 - on contextual_categories (status);
- .\supabase\migrations\001_object_action_backbone.sql:361 - create index if not exists contextual_categories_is_active_idx
- .\supabase\migrations\001_object_action_backbone.sql:362 - on contextual_categories (is_active);
- .\supabase\migrations\001_object_action_backbone.sql:371 - contextual_category_id uuid references contextual_categories(id) on delete restrict,
- .\supabase\migrations\001_object_action_backbone.sql:525 - contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
- .\supabase\migrations\001_object_action_backbone.sql:659 - select 1 from pg_trigger where tgname = 'contextual_categories_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:661 - create trigger contextual_categories_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:662 - before update on contextual_categories
- .\supabase\migrations\002_seed_object_action_rubricator.sql:175 - insert into contextual_categories (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:240 - from contextual_categories existing
- .\supabase\migrations\002_seed_object_action_rubricator.sql:377 - contextual_categories.id,
- .\supabase\migrations\002_seed_object_action_rubricator.sql:398 - join contextual_categories
- .\supabase\migrations\002_seed_object_action_rubricator.sql:399 - on contextual_categories.context_id = contexts.id
- .\supabase\migrations\002_seed_object_action_rubricator.sql:400 - and lower(contextual_categories.slug) = lower(seed.category_slug)
- .\supabase\migrations\002_seed_object_action_rubricator.sql:404 - where existing.contextual_category_id = contextual_categories.id
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:24 - contextual_categories.id as contextual_category_id,
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:57 - join contextual_categories
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:58 - on contextual_categories.context_id = contexts.id
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:59 - and lower(contextual_categories.slug) = lower(business_categories.slug)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:68 - and existing.contextual_category_id = contextual_categories.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:3 - create or replace view public_contextual_categories
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:7 - contextual_categories.id as category_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:8 - contextual_categories.context_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:11 - contextual_categories.parent_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:14 - contextual_categories.slug as category_slug,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:15 - contextual_categories.name as category_default_name,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:16 - contextual_categories.description as category_default_description,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:17 - contextual_categories.status,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18 - contextual_categories.source_type,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:19 - contextual_categories.sort_order,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:20 - contextual_categories.is_active,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:21 - contextual_categories.created_at,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:22 - contextual_categories.updated_at
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:23 - from contextual_categories
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25 - on contexts.id = contextual_categories.context_id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:26 - left join contextual_categories parent_categories
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:27 - on parent_categories.id = contextual_categories.parent_id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:28 - where contextual_categories.is_active = true
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:29 - and contextual_categories.status in ('approved', 'published')
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:33 - create or replace view directory_contextual_categories
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:37 - public_contextual_categories.category_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:38 - public_contextual_categories.context_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:39 - public_contextual_categories.context_code,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:40 - public_contextual_categories.parent_id,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:41 - public_contextual_categories.parent_slug,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:42 - public_contextual_categories.parent_default_name,
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:43 - public_contextual_categories.category_slug,

References truncated. Total matches: 126

---

## Term: entity_classifications

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (25 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (2 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\src\app\api\directory\filters\route.ts (1 matches)
- .\src\app\api\directory\organizations\route.ts (1 matches)
- .\src\app\api\object-action\suggestions\route.ts (5 matches)
- .\lib\objectAction\queries.ts (1 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
- .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
- .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
- .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
- .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
- .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
- .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
- .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
- .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
- .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
- .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
- .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
- .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:3 - insert into entity_classifications (
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:62 - from entity_classifications existing
- .\src\app\admin\object-action\classifications\page.tsx:506 - .from("entity_classifications")
- .\src\app\api\directory\filters\route.ts:379 - .from("entity_classifications")
- .\src\app\api\directory\organizations\route.ts:546 - .from("entity_classifications")
- .\src\app\api\object-action\suggestions\route.ts:1350 - .from("entity_classifications")
- .\src\app\api\object-action\suggestions\route.ts:1479 - .from("entity_classifications")
- .\src\app\api\object-action\suggestions\route.ts:1534 - .from("entity_classifications")
- .\src\app\api\object-action\suggestions\route.ts:1540 - .from("entity_classifications")
- .\src\app\api\object-action\suggestions\route.ts:1566 - .from("entity_classifications")
- .\lib\objectAction\queries.ts:513 - .from("entity_classifications")
- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

---

## Term: object_action

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (14 matches)
- .\supabase\migrations\002_seed_object_action_rubricator.sql (2 matches)
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql (6 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (45 matches)
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql (5 matches)
- .\supabase\migrations\010_create_object_action_suggestion_events.sql (18 matches)
- .\supabase\migrations\011_update_object_action_suggestion_request_source_constraint.sql (4 matches)
- .\src\app\admin\object-action\categories\page.tsx (1 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (2 matches)
- .\src\app\api\directory\filters\route.ts (2 matches)
- .\src\app\api\directory\organizations\route.ts (4 matches)
- .\src\app\api\object-action\suggestions\route.ts (9 matches)
- .\src\app\api\object-action\suggestions\audit-verify\route.ts (2 matches)
- .\lib\objectAction\queries.ts (1 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)
- .\lib\objectAction\types.ts (6 matches)
- .\docs\p4-7-schema-inventory-raw.md (36 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:243 - create table if not exists object_action_affordances (
- .\supabase\migrations\001_object_action_backbone.sql:255 - constraint object_action_affordances_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:270 - constraint object_action_affordances_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:284 - create unique index if not exists object_action_affordances_unique_idx
- .\supabase\migrations\001_object_action_backbone.sql:285 - on object_action_affordances (
- .\supabase\migrations\001_object_action_backbone.sql:291 - create index if not exists object_action_affordances_object_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:292 - on object_action_affordances (object_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:294 - create index if not exists object_action_affordances_action_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:295 - on object_action_affordances (action_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:297 - create index if not exists object_action_affordances_context_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:298 - on object_action_affordances (context_id);
- .\supabase\migrations\001_object_action_backbone.sql:650 - select 1 from pg_trigger where tgname = 'object_action_affordances_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:652 - create trigger object_action_affordances_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:653 - before update on object_action_affordances
- .\supabase\migrations\002_seed_object_action_rubricator.sql:245 - insert into object_action_affordances (
- .\supabase\migrations\002_seed_object_action_rubricator.sql:327 - from object_action_affordances existing
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:184 - object_action_affordances.id as affordance_id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:190 - left join object_action_affordances
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:191 - on object_action_affordances.object_type_id = object_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:192 - and object_action_affordances.action_type_id = action_types.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:193 - and object_action_affordances.context_id = contexts.id
- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:194 - and object_action_affordances.status in ('approved', 'published')
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:3 - create table if not exists object_action_suggestion_requests (
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:47 - constraint object_action_suggestion_requests_user_text_not_empty
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:50 - constraint object_action_suggestion_requests_user_text_length
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:53 - constraint object_action_suggestion_requests_locale_not_empty
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:56 - constraint object_action_suggestion_requests_context_code_not_empty
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:59 - constraint object_action_suggestion_requests_entity_type_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:74 - constraint object_action_suggestion_requests_request_source_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:88 - constraint object_action_suggestion_requests_source_type_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:100 - constraint object_action_suggestion_requests_ai_status_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:115 - constraint object_action_suggestion_requests_ai_confidence_range
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:124 - constraint object_action_suggestion_requests_status_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:137 - constraint object_action_suggestion_requests_admin_decision_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:148 - constraint object_action_suggestion_requests_review_consistency
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:162 - comment on table object_action_suggestion_requests is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:165 - comment on column object_action_suggestion_requests.user_text is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:168 - comment on column object_action_suggestion_requests.context_code is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:171 - comment on column object_action_suggestion_requests.entity_type is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:174 - comment on column object_action_suggestion_requests.entity_id is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:177 - comment on column object_action_suggestion_requests.ai_status is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:180 - comment on column object_action_suggestion_requests.status is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:183 - create index if not exists object_action_suggestion_requests_status_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:184 - on object_action_suggestion_requests (status);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:186 - create index if not exists object_action_suggestion_requests_ai_status_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:187 - on object_action_suggestion_requests (ai_status);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:189 - create index if not exists object_action_suggestion_requests_context_code_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:190 - on object_action_suggestion_requests (context_code);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:192 - create index if not exists object_action_suggestion_requests_resolved_context_id_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:193 - on object_action_suggestion_requests (resolved_context_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:195 - create index if not exists object_action_suggestion_requests_entity_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:196 - on object_action_suggestion_requests (entity_type, entity_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:198 - create index if not exists object_action_suggestion_requests_created_by_user_id_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:199 - on object_action_suggestion_requests (created_by_user_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:201 - create index if not exists object_action_suggestion_requests_matched_existing_category_id_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:202 - on object_action_suggestion_requests (matched_existing_category_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:204 - create index if not exists object_action_suggestion_requests_created_at_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:205 - on object_action_suggestion_requests (created_at desc);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:207 - create index if not exists object_action_suggestion_requests_ai_analysis_json_gin_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:208 - on object_action_suggestion_requests

References truncated. Total matches: 158

---

## Term: objectAction

Referenced in files:
- .\src\app\admin\object-action\page.tsx (1 matches)
- .\src\app\admin\object-action\categories\page.tsx (1 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (1 matches)
- .\src\app\api\directory\filters\route.ts (7 matches)
- .\src\app\api\directory\organizations\route.ts (21 matches)
- .\src\app\api\object-action\suggestions\route.ts (11 matches)
- .\lib\objectAction\queries.ts (46 matches)
- .\lib\objectAction\suggestionAnalysis.ts (20 matches)
- .\lib\objectAction\types.ts (39 matches)

### First references

- .\src\app\admin\object-action\page.tsx:212 - export default async function AdminObjectActionHubPage() {
- .\src\app\admin\object-action\categories\page.tsx:957 - export default async function AdminObjectActionCategoriesPage({
- .\src\app\admin\object-action\classifications\page.tsx:768 - export default async function AdminObjectActionClassificationsPage({
- .\src\app\admin\object-action\suggestions\page.tsx:868 - export default async function AdminObjectActionSuggestionsPage({
- .\src\app\api\directory\filters\route.ts:175 - function getObjectActionCategoryIdSet(rows: DirectoryEntityClassificationRow[]) {
- .\src\app\api\directory\filters\route.ts:186 - objectActionCategoryIds: Set<string>;
- .\src\app\api\directory\filters\route.ts:203 - const isUsedByObjectAction = input.objectActionCategoryIds.has(
- .\src\app\api\directory\filters\route.ts:208 - if (!isUsedByObjectAction && !isUsedByLegacy) {
- .\src\app\api\directory\filters\route.ts:413 - const objectActionCategoryIds =
- .\src\app\api\directory\filters\route.ts:414 - getObjectActionCategoryIdSet(classificationRows);
- .\src\app\api\directory\filters\route.ts:422 - objectActionCategoryIds,
- .\src\app\api\directory\organizations\route.ts:147 - type DirectoryObjectActionClassification = {
- .\src\app\api\directory\organizations\route.ts:524 - ): Promise<Map<string, DirectoryObjectActionClassification[]>> {
- .\src\app\api\directory\organizations\route.ts:527 - DirectoryObjectActionClassification[]
- .\src\app\api\directory\organizations\route.ts:650 - [...classifications].sort(compareObjectActionClassifications)
- .\src\app\api\directory\organizations\route.ts:657 - function compareObjectActionClassifications(
- .\src\app\api\directory\organizations\route.ts:658 - firstItem: DirectoryObjectActionClassification,
- .\src\app\api\directory\organizations\route.ts:659 - secondItem: DirectoryObjectActionClassification
- .\src\app\api\directory\organizations\route.ts:698 - function mapObjectActionCategoryToDirectoryCategory(
- .\src\app\api\directory\organizations\route.ts:699 - classification: DirectoryObjectActionClassification
- .\src\app\api\directory\organizations\route.ts:715 - classifications: DirectoryObjectActionClassification[]
- .\src\app\api\directory\organizations\route.ts:717 - const primaryObjectActionClassification =
- .\src\app\api\directory\organizations\route.ts:722 - if (primaryObjectActionClassification) {
- .\src\app\api\directory\organizations\route.ts:723 - return mapObjectActionCategoryToDirectoryCategory(
- .\src\app\api\directory\organizations\route.ts:724 - primaryObjectActionClassification
- .\src\app\api\directory\organizations\route.ts:735 - classifications: DirectoryObjectActionClassification[]
- .\src\app\api\directory\organizations\route.ts:816 - function objectActionCategoryMatchesFilter(
- .\src\app\api\directory\organizations\route.ts:817 - classification: DirectoryObjectActionClassification,
- .\src\app\api\directory\organizations\route.ts:854 - classifications: DirectoryObjectActionClassification[]
- .\src\app\api\directory\organizations\route.ts:866 - const hasMatchingObjectActionCategory = classifications.some(
- .\src\app\api\directory\organizations\route.ts:868 - objectActionCategoryMatchesFilter(classification, categoryCandidates)
- .\src\app\api\directory\organizations\route.ts:871 - if (hasMatchingObjectActionCategory) {
- .\src\app\api\object-action\suggestions\route.ts:5 - analyzeObjectActionSuggestion,
- .\src\app\api\object-action\suggestions\route.ts:6 - type ObjectActionExistingCategoryInput,
- .\src\app\api\object-action\suggestions\route.ts:7 - } from "../../../../../lib/objectAction/suggestionAnalysis";
- .\src\app\api\object-action\suggestions\route.ts:714 - async function createObjectActionSuggestionAuditEvent(
- .\src\app\api\object-action\suggestions\route.ts:814 - categories: ObjectActionExistingCategoryInput[];
- .\src\app\api\object-action\suggestions\route.ts:1198 - const analysis = await analyzeObjectActionSuggestion({
- .\src\app\api\object-action\suggestions\route.ts:1259 - const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
- .\src\app\api\object-action\suggestions\route.ts:1688 - const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
- .\src\app\api\object-action\suggestions\route.ts:1928 - const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
- .\src\app\api\object-action\suggestions\route.ts:2186 - const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
- .\src\app\api\object-action\suggestions\route.ts:2342 - const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
- .\lib\objectAction\queries.ts:10 - type ObjectActionLookupInput,
- .\lib\objectAction\queries.ts:11 - type ObjectActionStatus,
- .\lib\objectAction\queries.ts:14 - type ResolvedObjectActionCategory,
- .\lib\objectAction\queries.ts:20 - export type ObjectActionQueryError = {
- .\lib\objectAction\queries.ts:26 - export type ObjectActionQueryResult<T> = {
- .\lib\objectAction\queries.ts:28 - error: ObjectActionQueryError | null;
- .\lib\objectAction\queries.ts:31 - export type ObjectActionOption = {
- .\lib\objectAction\queries.ts:39 - export type ContextOption = ObjectActionOption;
- .\lib\objectAction\queries.ts:41 - export type ObjectTypeOption = ObjectActionOption & {
- .\lib\objectAction\queries.ts:45 - export type ActionTypeOption = ObjectActionOption;
- .\lib\objectAction\queries.ts:66 - status: ObjectActionStatus;
- .\lib\objectAction\queries.ts:80 - status?: ObjectActionStatus[];
- .\lib\objectAction\queries.ts:85 - status?: ObjectActionStatus[];
- .\lib\objectAction\queries.ts:93 - status?: ObjectActionStatus[];
- .\lib\objectAction\queries.ts:105 - status?: ObjectActionStatus[];
- .\lib\objectAction\queries.ts:110 - status: ObjectActionStatus;
- .\lib\objectAction\queries.ts:114 - const DEFAULT_PUBLIC_STATUSES: ObjectActionStatus[] = [

References truncated. Total matches: 148

---

## Term: suggestion

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (1 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (50 matches)
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql (5 matches)
- .\supabase\migrations\010_create_object_action_suggestion_events.sql (18 matches)
- .\supabase\migrations\011_update_object_action_suggestion_request_source_constraint.sql (4 matches)
- .\src\app\admin\page.tsx (1 matches)
- .\src\app\admin\object-action\page.tsx (5 matches)
- .\src\app\admin\object-action\categories\page.tsx (17 matches)
- .\src\app\admin\object-action\classifications\page.tsx (2 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (109 matches)
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx (37 matches)
- .\src\app\api\geo\areas\route.ts (11 matches)
- .\src\app\api\geo\suggestions\route.ts (31 matches)
- .\src\app\api\object-action\suggestions\route.ts (258 matches)
- .\src\app\api\object-action\suggestions\audit-verify\route.ts (39 matches)
- .\src\app\api\organizations\route.ts (6 matches)
- .\src\app\directory\page.tsx (2 matches)
- .\src\app\directory\components\DirectorySuggestionRequestForm.tsx (11 matches)
- .\src\app\organizations\page.tsx (2 matches)
- .\src\app\organizations\new\page.tsx (101 matches)
- .\lib\objectAction\suggestionAnalysis.ts (27 matches)
- .\lib\objectAction\types.ts (1 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:393 - 'ai_suggestion',
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:3 - create table if not exists object_action_suggestion_requests (
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:47 - constraint object_action_suggestion_requests_user_text_not_empty
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:50 - constraint object_action_suggestion_requests_user_text_length
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:53 - constraint object_action_suggestion_requests_locale_not_empty
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:56 - constraint object_action_suggestion_requests_context_code_not_empty
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:59 - constraint object_action_suggestion_requests_entity_type_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:74 - constraint object_action_suggestion_requests_request_source_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:88 - constraint object_action_suggestion_requests_source_type_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:100 - constraint object_action_suggestion_requests_ai_status_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:115 - constraint object_action_suggestion_requests_ai_confidence_range
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:124 - constraint object_action_suggestion_requests_status_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:137 - constraint object_action_suggestion_requests_admin_decision_allowed
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:148 - constraint object_action_suggestion_requests_review_consistency
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:162 - comment on table object_action_suggestion_requests is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:163 - 'Moderation queue for user-submitted Object-Action rubricator suggestions. These rows are not public categories and must not be used in public directory results until approved or merged into the real rubricator tables.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:165 - comment on column object_action_suggestion_requests.user_text is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:168 - comment on column object_action_suggestion_requests.context_code is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:171 - comment on column object_action_suggestion_requests.entity_type is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:172 - 'Polymorphic entity type connected with the suggestion, for example organization.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:174 - comment on column object_action_suggestion_requests.entity_id is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:175 - 'Optional polymorphic entity id connected with the suggestion, for example organizations.id.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:177 - comment on column object_action_suggestion_requests.ai_status is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:180 - comment on column object_action_suggestion_requests.status is
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:181 - 'Moderation status of the suggestion request. Public publication happens only after admin moderation and promotion into real rubricator tables.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:183 - create index if not exists object_action_suggestion_requests_status_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:184 - on object_action_suggestion_requests (status);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:186 - create index if not exists object_action_suggestion_requests_ai_status_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:187 - on object_action_suggestion_requests (ai_status);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:189 - create index if not exists object_action_suggestion_requests_context_code_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:190 - on object_action_suggestion_requests (context_code);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:192 - create index if not exists object_action_suggestion_requests_resolved_context_id_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:193 - on object_action_suggestion_requests (resolved_context_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:195 - create index if not exists object_action_suggestion_requests_entity_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:196 - on object_action_suggestion_requests (entity_type, entity_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:198 - create index if not exists object_action_suggestion_requests_created_by_user_id_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:199 - on object_action_suggestion_requests (created_by_user_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:201 - create index if not exists object_action_suggestion_requests_matched_existing_category_id_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:202 - on object_action_suggestion_requests (matched_existing_category_id);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:204 - create index if not exists object_action_suggestion_requests_created_at_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:205 - on object_action_suggestion_requests (created_at desc);
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:207 - create index if not exists object_action_suggestion_requests_ai_analysis_json_gin_idx
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:208 - on object_action_suggestion_requests
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:216 - where tgname = 'object_action_suggestion_requests_set_updated_at'
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:218 - create trigger object_action_suggestion_requests_set_updated_at
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:219 - before update on object_action_suggestion_requests
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:225 - alter table object_action_suggestion_requests enable row level security;
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:227 - grant insert on object_action_suggestion_requests to anon, authenticated;
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:229 - drop policy if exists "Public can submit object action suggestion requests" on object_action_suggestion_requests;
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:231 - create policy "Public can submit object action suggestion requests"
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:232 - on object_action_suggestion_requests
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql:3 - alter table object_action_suggestion_requests
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql:6 - alter table object_action_suggestion_requests
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql:7 - drop constraint if exists object_action_suggestion_requests_admin_decision_allowed;
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql:9 - alter table object_action_suggestion_requests
- .\supabase\migrations\009_update_object_action_suggestion_admin_decision_constraint.sql:10 - add constraint object_action_suggestion_requests_admin_decision_allowed
- .\supabase\migrations\010_create_object_action_suggestion_events.sql:3 - create table if not exists object_action_suggestion_events (
- .\supabase\migrations\010_create_object_action_suggestion_events.sql:6 - suggestion_request_id uuid not null references object_action_suggestion_requests(id),
- .\supabase\migrations\010_create_object_action_suggestion_events.sql:36 - constraint object_action_suggestion_events_event_type_allowed
- .\supabase\migrations\010_create_object_action_suggestion_events.sql:52 - constraint object_action_suggestion_events_event_source_allowed

References truncated. Total matches: 738

---

## Term: suggestions

Referenced in files:
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (1 matches)
- .\src\app\admin\object-action\page.tsx (3 matches)
- .\src\app\admin\object-action\categories\page.tsx (5 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (31 matches)
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx (4 matches)
- .\src\app\api\geo\areas\route.ts (7 matches)
- .\src\app\api\geo\suggestions\route.ts (10 matches)
- .\src\app\api\object-action\suggestions\route.ts (24 matches)
- .\src\app\directory\components\DirectorySuggestionRequestForm.tsx (3 matches)
- .\src\app\organizations\new\page.tsx (6 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:163 - 'Moderation queue for user-submitted Object-Action rubricator suggestions. These rows are not public categories and must not be used in public directory results until approved or merged into the real rubricator tables.';
- .\src\app\admin\object-action\page.tsx:39 - "Review contextual categories, their status, origin from suggestions and category mutation audit history.",
- .\src\app\admin\object-action\page.tsx:44 - href: "/admin/object-action/suggestions",
- .\src\app\admin\object-action\page.tsx:380 - categories, suggestions, classifications
- .\src\app\admin\object-action\categories\page.tsx:154 - { value: "suggestion", label: "Created from suggestions" },
- .\src\app\admin\object-action\categories\page.tsx:992 - const createdFromSuggestionsCount = categories.filter(
- .\src\app\admin\object-action\categories\page.tsx:1045 - href="/admin/object-action/suggestions"
- .\src\app\admin\object-action\categories\page.tsx:1221 - Created from suggestions
- .\src\app\admin\object-action\categories\page.tsx:1224 - {createdFromSuggestionsCount}
- .\src\app\admin\object-action\classifications\page.tsx:865 - href="/admin/object-action/suggestions"
- .\src\app\admin\object-action\suggestions\page.tsx:8 - type SuggestionStatusFilter =
- .\src\app\admin\object-action\suggestions\page.tsx:18 - type AdminSuggestionsPageProps = {
- .\src\app\admin\object-action\suggestions\page.tsx:102 - suggestions: SuggestionRequestRow[];
- .\src\app\admin\object-action\suggestions\page.tsx:106 - statusFilter: SuggestionStatusFilter;
- .\src\app\admin\object-action\suggestions\page.tsx:134 - const DEFAULT_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
- .\src\app\admin\object-action\suggestions\page.tsx:137 - value: SuggestionStatusFilter;
- .\src\app\admin\object-action\suggestions\page.tsx:150 - const ALLOWED_STATUS_FILTERS = new Set<SuggestionStatusFilter>(
- .\src\app\admin\object-action\suggestions\page.tsx:164 - ): SuggestionStatusFilter {
- .\src\app\admin\object-action\suggestions\page.tsx:171 - const typedValue = normalizedValue as SuggestionStatusFilter;
- .\src\app\admin\object-action\suggestions\page.tsx:469 - function getStatusFilterHref(status: SuggestionStatusFilter) {
- .\src\app\admin\object-action\suggestions\page.tsx:470 - return `/admin/object-action/suggestions?status=${status}`;
- .\src\app\admin\object-action\suggestions\page.tsx:658 - statusFilter: SuggestionStatusFilter,
- .\src\app\admin\object-action\suggestions\page.tsx:661 - suggestions: SuggestionRequestRow[];
- .\src\app\admin\object-action\suggestions\page.tsx:714 - suggestions: [],
- .\src\app\admin\object-action\suggestions\page.tsx:720 - suggestions: (data as unknown as SuggestionRequestRow[] | null) ?? [],
- .\src\app\admin\object-action\suggestions\page.tsx:797 - statusFilter: SuggestionStatusFilter,
- .\src\app\admin\object-action\suggestions\page.tsx:807 - suggestions: [],
- .\src\app\admin\object-action\suggestions\page.tsx:823 - suggestions: [],
- .\src\app\admin\object-action\suggestions\page.tsx:833 - const { suggestions, errorMessage: suggestionsErrorMessage } =
- .\src\app\admin\object-action\suggestions\page.tsx:836 - if (suggestionsErrorMessage) {
- .\src\app\admin\object-action\suggestions\page.tsx:840 - suggestions: [],
- .\src\app\admin\object-action\suggestions\page.tsx:842 - errorMessage: suggestionsErrorMessage,
- .\src\app\admin\object-action\suggestions\page.tsx:853 - suggestions.map((suggestion) => suggestion.id)
- .\src\app\admin\object-action\suggestions\page.tsx:859 - suggestions,
- .\src\app\admin\object-action\suggestions\page.tsx:868 - export default async function AdminObjectActionSuggestionsPage({
- .\src\app\admin\object-action\suggestions\page.tsx:870 - }: AdminSuggestionsPageProps) {
- .\src\app\admin\object-action\suggestions\page.tsx:878 - suggestions,
- .\src\app\admin\object-action\suggestions\page.tsx:884 - const needsReviewCount = suggestions.filter(
- .\src\app\admin\object-action\suggestions\page.tsx:1052 - {suggestions.length}
- .\src\app\admin\object-action\suggestions\page.tsx:1192 - {suggestions.length === 0 ? (
- .\src\app\admin\object-action\suggestions\page.tsx:1204 - {suggestions.map((suggestion) => {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:406 - `AI analysis can only run for draft, suggested or needs_review suggestions. Current status: "${currentStatus}".`
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:424 - const response = await fetch("/api/object-action/suggestions", {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:532 - const response = await fetch("/api/object-action/suggestions", {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:630 - const response = await fetch("/api/object-action/suggestions", {
- .\src\app\api\geo\areas\route.ts:425 - const includeOwnSuggestionsParam = url.searchParams.get(
- .\src\app\api\geo\areas\route.ts:426 - "includeOwnSuggestions"
- .\src\app\api\geo\areas\route.ts:435 - const includeOwnSuggestions = includeOwnSuggestionsParam === "true";
- .\src\app\api\geo\areas\route.ts:481 - const appUser = includeOwnSuggestions
- .\src\app\api\geo\areas\route.ts:506 - if (includeOwnSuggestions && appUser && (!status || status === "approved")) {
- .\src\app\api\geo\areas\route.ts:531 - status: status ?? "approved_plus_own_suggestions_if_requested",
- .\src\app\api\geo\areas\route.ts:533 - includeOwnSuggestions,
- .\src\app\api\geo\suggestions\route.ts:275 - return "parentId is not allowed for country suggestions";
- .\src\app\api\geo\suggestions\route.ts:282 - return "parentId is required for district and neighborhood suggestions";
- .\src\app\api\geo\suggestions\route.ts:461 - async function getParentAreasForSuggestions(suggestions: GeoAreaRow[]) {
- .\src\app\api\geo\suggestions\route.ts:464 - suggestions
- .\src\app\api\geo\suggestions\route.ts:541 - const { data: suggestions, error: suggestionsError } = await supabase
- .\src\app\api\geo\suggestions\route.ts:570 - if (suggestionsError) {
- .\src\app\api\geo\suggestions\route.ts:572 - { error: suggestionsError.message },
- .\src\app\api\geo\suggestions\route.ts:577 - const suggestionRows = (suggestions ?? []) as GeoAreaRow[];

References truncated. Total matches: 96

---

## Term: moderation

Referenced in files:
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (2 matches)
- .\src\app\admin\page.tsx (1 matches)
- .\src\app\admin\object-action\page.tsx (3 matches)
- .\src\app\admin\object-action\categories\CategoryAdminButtons.tsx (2 matches)
- .\src\app\admin\object-action\categories\page.tsx (4 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (6 matches)
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx (33 matches)
- .\src\app\api\object-action\categories\route.ts (1 matches)
- .\src\app\api\object-action\suggestions\route.ts (20 matches)
- .\src\app\directory\components\DirectorySuggestionRequestForm.tsx (2 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:163 - 'Moderation queue for user-submitted Object-Action rubricator suggestions. These rows are not public categories and must not be used in public directory results until approved or merged into the real rubricator tables.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:181 - 'Moderation status of the suggestion request. Public publication happens only after admin moderation and promotion into real rubricator tables.';
- .\src\app\admin\page.tsx:39 - "Central hub for contextual categories, suggestion moderation and entity classifications.",
- .\src\app\admin\object-action\page.tsx:43 - title: "Suggestion moderation",
- .\src\app\admin\object-action\page.tsx:47 - badge: "Moderation",
- .\src\app\admin\object-action\page.tsx:303 - Use this page to navigate between categories, suggestion moderation,
- .\src\app\admin\object-action\categories\CategoryAdminButtons.tsx:189 - moderation?: {
- .\src\app\admin\object-action\categories\CategoryAdminButtons.tsx:207 - payload.moderation?.note ??
- .\src\app\admin\object-action\categories\page.tsx:1051 - Suggestion moderation →
- .\src\app\admin\object-action\categories\page.tsx:1086 - suggestion moderation.
- .\src\app\admin\object-action\categories\page.tsx:1622 - Category origin from suggestion moderation
- .\src\app\admin\object-action\categories\page.tsx:1704 - moderation.
- .\src\app\admin\object-action\classifications\page.tsx:871 - Suggestion moderation {"\u2192"}
- .\src\app\admin\object-action\suggestions\page.tsx:4 - import SuggestionModerationButtons from "./SuggestionModerationButtons";
- .\src\app\admin\object-action\suggestions\page.tsx:979 - Moderation queue for user-submitted missing business directions.
- .\src\app\admin\object-action\suggestions\page.tsx:981 - Object-Action Rubricator until explicit moderation.
- .\src\app\admin\object-action\suggestions\page.tsx:1187 - slug and comment. Each moderation action is shown in the
- .\src\app\admin\object-action\suggestions\page.tsx:1712 - <SuggestionModerationButtons
- .\src\app\admin\object-action\suggestions\page.tsx:1751 - Moderation timeline / Audit history
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:13 - type ModerationAction =
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:18 - type ModerationSubmitStatus = "idle" | "submitting" | "success" | "error";
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:20 - type SuggestionModerationButtonsProps = {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:36 - type ModerationApiResponse = {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:63 - moderation?: {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:142 - function getActionLabel(action: ModerationAction) {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:252 - function getAiAnalysisMessage(json: ModerationApiResponse) {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:288 - function getModerationSuccessMessage(
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:290 - json: ModerationApiResponse
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:292 - const nextStatus = json.suggestionRequest?.status ?? json.moderation?.nextStatus;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:295 - const categoryName = json.moderation?.matchedExistingCategoryName;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:296 - const categorySlug = json.moderation?.matchedExistingCategorySlug;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:314 - function getApproveNewCategorySuccessMessage(json: ModerationApiResponse) {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:315 - const categoryName = json.moderation?.createdContextualCategoryName;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:316 - const categorySlug = json.moderation?.createdContextualCategorySlug;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:322 - const sourceText = json.moderation?.newCategorySource
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:323 - ? ` Source: ${json.moderation.newCategorySource}.`
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:327 - json.suggestionRequest?.status ?? json.moderation?.nextStatus ?? "approved"
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:331 - export default function SuggestionModerationButtons({
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:338 - }: SuggestionModerationButtonsProps) {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:342 - useState<ModerationSubmitStatus>("idle");
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:343 - const [activeAction, setActiveAction] = useState<ModerationAction | null>(
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:435 - const json = (await response.json()) as ModerationApiResponse;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:547 - const json = (await response.json()) as ModerationApiResponse;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:575 - async function submitModerationAction(action: StatusChangingAction) {
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:642 - const json = (await response.json()) as ModerationApiResponse;
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:656 - setMessage(getModerationSuccessMessage(action, json));
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:692 - Moderation closed
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:704 - moderation actions.
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:737 - Moderation actions
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:773 - onClick={() => submitModerationAction("approve_existing_match")}
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:800 - onClick={() => submitModerationAction("reject")}
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:820 - onClick={() => submitModerationAction("archive")}
- .\src\app\api\object-action\categories\route.ts:772 - moderation: {
- .\src\app\api\object-action\suggestions\route.ts:24 - type SuggestionModerationRequestBody = {
- .\src\app\api\object-action\suggestions\route.ts:150 - type SuggestionModerationAction =
- .\src\app\api\object-action\suggestions\route.ts:292 - const ALLOWED_MODERATION_ACTIONS = new Set<SuggestionModerationAction>([
- .\src\app\api\object-action\suggestions\route.ts:407 - function normalizeModerationAction(value: unknown) {
- .\src\app\api\object-action\suggestions\route.ts:414 - const lowerValue = normalizedValue.toLowerCase() as SuggestionModerationAction;
- .\src\app\api\object-action\suggestions\route.ts:416 - if (!ALLOWED_MODERATION_ACTIONS.has(lowerValue)) {
- .\src\app\api\object-action\suggestions\route.ts:528 - function getStatusForModerationAction(

References truncated. Total matches: 76

---

## Term: category_profile

No references found.

---

## Term: category_profile_json

No references found.

---

## Term: classification

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (28 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (6 matches)
- .\src\app\admin\page.tsx (1 matches)
- .\src\app\admin\object-action\page.tsx (6 matches)
- .\src\app\admin\object-action\categories\page.tsx (2 matches)
- .\src\app\admin\object-action\classifications\page.tsx (85 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (13 matches)
- .\src\app\api\activity\record\route.ts (2 matches)
- .\src\app\api\directory\filters\route.ts (7 matches)
- .\src\app\api\directory\organizations\route.ts (69 matches)
- .\src\app\api\object-action\suggestions\route.ts (76 matches)
- .\lib\objectAction\queries.ts (21 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)
- .\lib\objectAction\types.ts (11 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
- .\supabase\migrations\001_object_action_backbone.sql:372 - classification_role text not null default 'primary',
- .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
- .\supabase\migrations\001_object_action_backbone.sql:388 - classification_role in (
- .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
- .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
- .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
- .\supabase\migrations\001_object_action_backbone.sql:442 - classification_role
- .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
- .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
- .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
- .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
- .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
- .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
- .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
- .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:3 - insert into entity_classifications (
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:10 - classification_role,
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:28 - end as classification_role,
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:45 - '003_backfill_organization_directory_classifications'
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:62 - from entity_classifications existing
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:69 - and existing.classification_role =
- .\src\app\admin\page.tsx:39 - "Central hub for contextual categories, suggestion moderation and entity classifications.",
- .\src\app\admin\object-action\page.tsx:50 - title: "Entity classifications",
- .\src\app\admin\object-action\page.tsx:51 - href: "/admin/object-action/classifications",
- .\src\app\admin\object-action\page.tsx:54 - badge: "Classifications",
- .\src\app\admin\object-action\page.tsx:60 - "Open the public business directory and verify how approved categories and classifications are visible to users.",
- .\src\app\admin\object-action\page.tsx:304 - entity classifications and the public directory.
- .\src\app\admin\object-action\page.tsx:380 - categories, suggestions, classifications
- .\src\app\admin\object-action\categories\page.tsx:1055 - href="/admin/object-action/classifications"
- .\src\app\admin\object-action\categories\page.tsx:1061 - Classifications {"\u2192"}
- .\src\app\admin\object-action\classifications\page.tsx:7 - type ClassificationStatusFilter =
- .\src\app\admin\object-action\classifications\page.tsx:17 - type AdminClassificationsPageProps = {
- .\src\app\admin\object-action\classifications\page.tsx:41 - type EntityClassificationRow = {
- .\src\app\admin\object-action\classifications\page.tsx:49 - classification_role: string;
- .\src\app\admin\object-action\classifications\page.tsx:102 - classifications: EntityClassificationRow[];
- .\src\app\admin\object-action\classifications\page.tsx:110 - statusFilter: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:117 - const DEFAULT_STATUS_FILTER: ClassificationStatusFilter = "all";
- .\src\app\admin\object-action\classifications\page.tsx:123 - value: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:143 - const ALLOWED_STATUS_FILTERS = new Set<ClassificationStatusFilter>(
- .\src\app\admin\object-action\classifications\page.tsx:161 - ): ClassificationStatusFilter {
- .\src\app\admin\object-action\classifications\page.tsx:168 - const typedValue = normalizedValue as ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:316 - status?: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:339 - return `/admin/object-action/classifications?${searchParams.toString()}`;
- .\src\app\admin\object-action\classifications\page.tsx:478 - async function getClassifications(params: {
- .\src\app\admin\object-action\classifications\page.tsx:479 - statusFilter: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:485 - classifications: EntityClassificationRow[];
- .\src\app\admin\object-action\classifications\page.tsx:493 - classifications: [],

References truncated. Total matches: 328

---

## Term: classifications

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (25 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (3 matches)
- .\src\app\admin\page.tsx (1 matches)
- .\src\app\admin\object-action\page.tsx (6 matches)
- .\src\app\admin\object-action\categories\page.tsx (2 matches)
- .\src\app\admin\object-action\classifications\page.tsx (51 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (3 matches)
- .\src\app\api\directory\filters\route.ts (4 matches)
- .\src\app\api\directory\organizations\route.ts (32 matches)
- .\src\app\api\object-action\suggestions\route.ts (5 matches)
- .\lib\objectAction\queries.ts (8 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
- .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
- .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
- .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
- .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
- .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
- .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
- .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
- .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
- .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
- .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
- .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
- .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
- .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
- .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
- .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
- .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
- .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
- .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
- .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:3 - insert into entity_classifications (
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:45 - '003_backfill_organization_directory_classifications'
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:62 - from entity_classifications existing
- .\src\app\admin\page.tsx:39 - "Central hub for contextual categories, suggestion moderation and entity classifications.",
- .\src\app\admin\object-action\page.tsx:50 - title: "Entity classifications",
- .\src\app\admin\object-action\page.tsx:51 - href: "/admin/object-action/classifications",
- .\src\app\admin\object-action\page.tsx:54 - badge: "Classifications",
- .\src\app\admin\object-action\page.tsx:60 - "Open the public business directory and verify how approved categories and classifications are visible to users.",
- .\src\app\admin\object-action\page.tsx:304 - entity classifications and the public directory.
- .\src\app\admin\object-action\page.tsx:380 - categories, suggestions, classifications
- .\src\app\admin\object-action\categories\page.tsx:1055 - href="/admin/object-action/classifications"
- .\src\app\admin\object-action\categories\page.tsx:1061 - Classifications {"\u2192"}
- .\src\app\admin\object-action\classifications\page.tsx:7 - type ClassificationStatusFilter =
- .\src\app\admin\object-action\classifications\page.tsx:17 - type AdminClassificationsPageProps = {
- .\src\app\admin\object-action\classifications\page.tsx:102 - classifications: EntityClassificationRow[];
- .\src\app\admin\object-action\classifications\page.tsx:110 - statusFilter: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:117 - const DEFAULT_STATUS_FILTER: ClassificationStatusFilter = "all";
- .\src\app\admin\object-action\classifications\page.tsx:123 - value: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:143 - const ALLOWED_STATUS_FILTERS = new Set<ClassificationStatusFilter>(
- .\src\app\admin\object-action\classifications\page.tsx:161 - ): ClassificationStatusFilter {
- .\src\app\admin\object-action\classifications\page.tsx:168 - const typedValue = normalizedValue as ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:316 - status?: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:339 - return `/admin/object-action/classifications?${searchParams.toString()}`;
- .\src\app\admin\object-action\classifications\page.tsx:478 - async function getClassifications(params: {
- .\src\app\admin\object-action\classifications\page.tsx:479 - statusFilter: ClassificationStatusFilter;
- .\src\app\admin\object-action\classifications\page.tsx:485 - classifications: EntityClassificationRow[];
- .\src\app\admin\object-action\classifications\page.tsx:493 - classifications: [],
- .\src\app\admin\object-action\classifications\page.tsx:500 - classifications: [],
- .\src\app\admin\object-action\classifications\page.tsx:506 - .from("entity_classifications")
- .\src\app\admin\object-action\classifications\page.tsx:550 - classifications: [],
- .\src\app\admin\object-action\classifications\page.tsx:556 - classifications: (data as unknown as EntityClassificationRow[] | null) ?? [],
- .\src\app\admin\object-action\classifications\page.tsx:561 - async function getRelatedData(classifications: EntityClassificationRow[]): Promise<{
- .\src\app\admin\object-action\classifications\page.tsx:570 - classifications
- .\src\app\admin\object-action\classifications\page.tsx:575 - classifications.map((item) => item.object_type_id)
- .\src\app\admin\object-action\classifications\page.tsx:578 - classifications.map((item) => item.action_type_id)

References truncated. Total matches: 141

---

## Term: rubricator

Referenced in files:
- .\supabase\migrations\001_object_action_backbone.sql (13 matches)
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql (1 matches)
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql (3 matches)
- .\src\app\admin\page.tsx (2 matches)
- .\src\app\admin\object-action\page.tsx (2 matches)
- .\src\app\admin\object-action\categories\page.tsx (1 matches)
- .\src\app\admin\object-action\classifications\page.tsx (1 matches)
- .\src\app\admin\object-action\suggestions\page.tsx (3 matches)
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx (1 matches)
- .\src\app\api\directory\filters\route.ts (22 matches)
- .\src\app\api\object-action\suggestions\route.ts (4 matches)
- .\lib\objectAction\suggestionAnalysis.ts (1 matches)
- .\docs\p4-7-schema-inventory-raw.md (36 matches)

### First references

- .\supabase\migrations\001_object_action_backbone.sql:5 - create or replace function set_universal_rubricator_updated_at()
- .\supabase\migrations\001_object_action_backbone.sql:619 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:628 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:637 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:646 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:655 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:664 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:673 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:682 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:691 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:700 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:709 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\001_object_action_backbone.sql:718 - execute function set_universal_rubricator_updated_at();
- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:47 - $$Migrated from legacy business_categories / organization_categories into the Object-Action Rubricator.$$ as notes
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:163 - 'Moderation queue for user-submitted Object-Action rubricator suggestions. These rows are not public categories and must not be used in public directory results until approved or merged into the real rubricator tables.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:181 - 'Moderation status of the suggestion request. Public publication happens only after admin moderation and promotion into real rubricator tables.';
- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:221 - execute function set_universal_rubricator_updated_at();
- .\src\app\admin\page.tsx:36 - title: "Object-Action Rubricator",
- .\src\app\admin\page.tsx:40 - badge: "Rubricator",
- .\src\app\admin\object-action\page.tsx:53 - "Read-only overview of how organizations and other entities are classified in the Object-Action Rubricator.",
- .\src\app\admin\object-action\page.tsx:291 - Central entry point for Object-Action Rubricator administration.
- .\src\app\admin\object-action\categories\page.tsx:1085 - Rubricator. This page helps verify what actually exists after
- .\src\app\admin\object-action\classifications\page.tsx:905 - Object-Action Rubricator. This page does not mutate data.
- .\src\app\admin\object-action\suggestions\page.tsx:981 - Object-Action Rubricator until explicit moderation.
- .\src\app\admin\object-action\suggestions\page.tsx:994 - merges Object-Action Rubricator data automatically.
- .\src\app\admin\object-action\suggestions\page.tsx:1552 - "AI analysis is advisory only. It does not create, approve, publish or merge Object-Action Rubricator data."}
- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:518 - "This WILL create a new category in the Object-Action Rubricator.",
- .\src\app\api\directory\filters\route.ts:34 - type RubricatorCategoryRow = {
- .\src\app\api\directory\filters\route.ts:75 - const PUBLIC_RUBRICATOR_CATEGORY_STATUSES = new Set([
- .\src\app\api\directory\filters\route.ts:130 - function isPublicRubricatorCategory(row: RubricatorCategoryRow) {
- .\src\app\api\directory\filters\route.ts:131 - return PUBLIC_RUBRICATOR_CATEGORY_STATUSES.has(
- .\src\app\api\directory\filters\route.ts:183 - function mapCategoriesFromRubricator(input: {
- .\src\app\api\directory\filters\route.ts:185 - rubricatorRows: RubricatorCategoryRow[];
- .\src\app\api\directory\filters\route.ts:191 - for (const rubricatorCategory of input.rubricatorRows) {
- .\src\app\api\directory\filters\route.ts:192 - if (!isPublicRubricatorCategory(rubricatorCategory)) {
- .\src\app\api\directory\filters\route.ts:196 - const slug = normalizeTextValue(rubricatorCategory.category_slug);
- .\src\app\api\directory\filters\route.ts:204 - rubricatorCategory.category_id
- .\src\app\api\directory\filters\route.ts:213 - id: rubricatorCategory.category_id,
- .\src\app\api\directory\filters\route.ts:216 - normalizeTextValue(rubricatorCategory.display_name) ||
- .\src\app\api\directory\filters\route.ts:217 - normalizeTextValue(rubricatorCategory.default_name) ||
- .\src\app\api\directory\filters\route.ts:221 - rubricatorCategory.display_description ??
- .\src\app\api\directory\filters\route.ts:222 - rubricatorCategory.default_description ??
- .\src\app\api\directory\filters\route.ts:226 - typeof rubricatorCategory.sort_order === "number"
- .\src\app\api\directory\filters\route.ts:227 - ? rubricatorCategory.sort_order
- .\src\app\api\directory\filters\route.ts:348 - rubricatorCategoriesResult,
- .\src\app\api\directory\filters\route.ts:416 - const categories = rubricatorCategoriesResult.error
- .\src\app\api\directory\filters\route.ts:418 - : mapCategoriesFromRubricator({
- .\src\app\api\directory\filters\route.ts:420 - rubricatorRows:
- .\src\app\api\directory\filters\route.ts:421 - (rubricatorCategoriesResult.data ?? []) as RubricatorCategoryRow[],
- .\src\app\api\object-action\suggestions\route.ts:1225 - "AI analysis is advisory only. It does not create, approve, publish or merge Object-Action Rubricator data.",
- .\src\app\api\object-action\suggestions\route.ts:1284 - "AI analysis is advisory only. It does not create, approve, publish or merge Object-Action Rubricator data.",
- .\src\app\api\object-action\suggestions\route.ts:2204 - "Reject and archive actions only change the suggestion request status. They do not create or publish Object-Action Rubricator data.",
- .\src\app\api\object-action\suggestions\route.ts:2371 - "Suggestion request was created as a moderation request only. It does not create, approve, publish or merge Object-Action Rubricator data.",
- .\lib\objectAction\suggestionAnalysis.ts:292 - "You analyze user-submitted business direction suggestions for an Object-Action Rubricator.",
- .\docs\p4-7-schema-inventory-raw.md:134 - - .\supabase\migrations\002_seed_object_action_rubricator.sql (7 matches)
- .\docs\p4-7-schema-inventory-raw.md:162 - File: .\supabase\migrations\002_seed_object_action_rubricator.sql
- .\docs\p4-7-schema-inventory-raw.md:167 - File: .\supabase\migrations\002_seed_object_action_rubricator.sql
- .\docs\p4-7-schema-inventory-raw.md:172 - File: .\supabase\migrations\002_seed_object_action_rubricator.sql
- .\docs\p4-7-schema-inventory-raw.md:177 - File: .\supabase\migrations\002_seed_object_action_rubricator.sql
- .\docs\p4-7-schema-inventory-raw.md:182 - File: .\supabase\migrations\002_seed_object_action_rubricator.sql

References truncated. Total matches: 90

---

## Preliminary inventory table

| Area | Existing? | Key files/tables | Status fields | RLS/policies | Used by routes/UI? | Decision |
|---|---:|---|---|---|---|---|
| object_classes | TBD | TBD | TBD | TBD | TBD | inventory needed |
| object_types | TBD | TBD | TBD | TBD | TBD | inventory needed |
| action_types | TBD | TBD | TBD | TBD | TBD | inventory needed |
| contexts | TBD | TBD | TBD | TBD | TBD | inventory needed |
| affordances | TBD | TBD | TBD | TBD | TBD | inventory needed |
| contextual_categories | TBD | TBD | TBD | TBD | TBD | inventory needed |
| entity_classifications | TBD | TBD | TBD | TBD | TBD | inventory needed |
| suggestion/moderation flow | TBD | TBD | TBD | TBD | TBD | inventory needed |
| value_objects.category_profile_json | TBD | TBD | TBD | TBD | TBD | mapping decision needed |
| template/type -> object/action/context | TBD | TBD | TBD | TBD | TBD | compatibility decision needed |

---

## P4.7.1-R-C Supabase table verification

Date: 2026-05-15

Verification source: Supabase SQL Editor.

| table_name | table_status | rls_status | policy_count |
|---|---|---|---:|
| action_types | EXISTS | RLS_ENABLED | 1 |
| contexts | EXISTS | RLS_ENABLED | 1 |
| contextual_categories | EXISTS | RLS_ENABLED | 1 |
| entity_classifications | EXISTS | RLS_ENABLED | 1 |
| object_action_affordances | EXISTS | RLS_ENABLED | 1 |
| object_action_aliases | MISSING | RLS_NOT_ENABLED_OR_MISSING | 0 |
| object_action_suggestion_items | MISSING | RLS_NOT_ENABLED_OR_MISSING | 0 |
| object_action_suggestion_requests | EXISTS | RLS_ENABLED | 1 |
| object_action_translations | MISSING | RLS_NOT_ENABLED_OR_MISSING | 0 |
| object_classes | EXISTS | RLS_ENABLED | 1 |
| object_types | EXISTS | RLS_ENABLED | 1 |

Conclusion:

P4.7.1-R is completed.

The core Object-Action Rubricator backbone exists in Supabase and is protected by RLS.

Existing core tables:

- object_classes
- object_types
- action_types
- contexts
- object_action_affordances
- contextual_categories
- entity_classifications
- object_action_suggestion_requests

Missing tables are not blockers for P4.7-R MVP:

- object_action_aliases
- object_action_translations
- object_action_suggestion_items

These missing tables are treated as future localization / alias / extended suggestion backlog, not as a blocker for the controlled rubricator -> Value Object bridge.

Next step:

P4.7.2-R — define mapping decision from contextual_category / entity_classification to ValueObjectBridgeMapping[].

